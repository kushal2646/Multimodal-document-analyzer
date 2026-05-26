import os
import magic
import shutil
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy import select, update, delete
from app.core.database import get_db, AsyncSessionLocal, Document, Chat
from app.core.config import settings
from app.api.auth import get_current_user
from app.services.ocr_engine import OCREngine
from app.services.groq_client import groq_service
from app.services.rag_pipeline import RAGPipeline
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])

SUPPORTED_MIME_TYPES = {
    "application/pdf": "PDF",
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/jpg": "JPG",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "text/plain": "TXT"
}

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

def validate_file(file: UploadFile) -> str:
    """Validate file size and actual MIME-type via magic bytes."""
    # 1. Verify file size (limit to 15MB)
    max_size = 15 * 1024 * 1024
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum limit of 15MB."
        )
        
    # 2. Verify MIME type using magic number signature checks
    head_bytes = file.file.read(2048)
    file.file.seek(0)
    
    mime_detector = magic.Magic(mime=True)
    detected_mime = mime_detector.from_buffer(head_bytes)
    
    if detected_mime not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format: {detected_mime}. Supported formats: PDF, PNG, JPG, JPEG, DOCX, TXT."
        )
        
    return detected_mime

async def process_document_task(doc_id: str, file_path: str, mime_type: str, user_id: int):
    """Background thread to process OCR, invoke Groq intelligence, and build RAG indices."""
    try:
        logger.info(f"Background processing started for document: {doc_id}")
        
        # 1. Text Extraction based on MIME Type
        extracted_text = ""
        
        if mime_type == "application/pdf":
            extracted_text, _ = OCREngine.extract_text_from_pdf(file_path)
        elif mime_type in ["image/png", "image/jpeg", "image/jpg"]:
            raw_ocr = OCREngine.extract_text_from_image(file_path)
            extracted_text = await groq_service.correct_ocr_with_vision(file_path, raw_ocr)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            extracted_text = OCREngine.extract_text_from_docx(file_path)
        elif mime_type == "text/plain":
            extracted_text = OCREngine.extract_text_from_txt(file_path)
            
        # Clean any invalid surrogate characters (0xD800 to 0xDFFF) to prevent UTF-8 encoding failures in Postgres/Groq
        extracted_text = "".join(c for c in extracted_text if not (0xD800 <= ord(c) <= 0xDFFF))
        
        if not extracted_text.strip():
            raise ValueError("Extracted document content is blank.")
            
        # 2. Invoke Groq AI services in parallel or sequence
        summary = await groq_service.generate_summary(extracted_text)
        insights = await groq_service.generate_insights(extracted_text)
        fake_analysis = await groq_service.detect_fake_document(extracted_text, os.path.basename(file_path))
        
        insights["integrity"] = fake_analysis
        
        # 3. Create FAISS Vector Indexes and persist to disk
        vector_status = RAGPipeline.build_vector_store(doc_id, extracted_text)
        if not vector_status:
            logger.warning(f"RAG vector indexing failed or was empty for doc {doc_id}")
            
        # 4. Save metadata records and set status to READY in SQL DB
        async with AsyncSessionLocal() as db:
            q = update(Document).where(Document.id == doc_id).values(
                extracted_text=extracted_text,
                summary=summary,
                smart_tags=insights.pop("smart_tags", []),
                insights=insights,
                status="ready"
            )
            await db.execute(q)
            await db.commit()
            
        logger.info(f"Background processing successfully completed for document: {doc_id}")
        
    except Exception as e:
        logger.error(f"Background processing failed for document {doc_id}: {e}")
        async with AsyncSessionLocal() as db:
            q = update(Document).where(Document.id == doc_id).values(
                status="failed",
                extracted_text=f"Processing error: {str(e)}"
            )
            await db.execute(q)
            await db.commit()

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Upload a file, store it locally, and start background RAG/OCR indexing thread."""
    mime_type = validate_file(file)
    
    # Store file to local disk
    doc_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1]
    saved_filename = f"{doc_id}{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to write uploaded file to disk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error writing file to local disk storage."
        )
        
    # Create preliminary document entry in SQL Database
    document_record = Document(
        id=doc_id,
        user_id=current_user.id,
        filename=file.filename,
        file_type=mime_type,
        file_url=f"/uploads/{saved_filename}",
        extracted_text="",
        status="processing",
        summary={
            "tldr": "",
            "bullets": [],
            "action_items": [],
            "detailed": ""
        },
        smart_tags=[],
        insights={
            "urgency_level": "LOW",
            "sentiment": "Neutral",
            "legal_risks": [],
            "detected_entities": {
                "dates": [],
                "monetary_values": [],
                "organizations": []
            },
            "integrity": {
                "is_fake": False,
                "fake_reasons": [],
                "tamper_score": 0.0
            }
        },
        created_at=datetime.utcnow()
    )
    
    db.add(document_record)
    await db.commit()
    await db.refresh(document_record)
    
    # Queue processing script on background pool
    background_tasks.add_task(
        process_document_task,
        doc_id,
        file_path,
        mime_type,
        current_user.id
    )
    
    return {
        "_id": document_record.id,
        "user_id": str(document_record.user_id),
        "filename": document_record.filename,
        "file_type": document_record.file_type,
        "file_url": document_record.file_url,
        "status": document_record.status,
        "summary": document_record.summary,
        "smart_tags": document_record.smart_tags,
        "insights": document_record.insights,
        "created_at": document_record.created_at.isoformat()
    }

@router.get("/", response_model=list)
async def list_documents(current_user = Depends(get_current_user), db = Depends(get_db)):
    """List all documents owned by the active user."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()
    
    # Map _id parameter for UI interface key bindings
    return [{
        "_id": doc.id,
        "user_id": str(doc.user_id),
        "filename": doc.filename,
        "file_type": doc.file_type,
        "file_url": doc.file_url,
        "status": doc.status,
        "summary": doc.summary,
        "smart_tags": doc.smart_tags,
        "insights": doc.insights,
        "created_at": doc.created_at.isoformat()
    } for doc in documents]

@router.get("/{doc_id}")
async def get_document(doc_id: str, current_user = Depends(get_current_user), db = Depends(get_db)):
    """Fetch all analytical data and extracted content for a specific document."""
    result = await db.execute(
        select(Document)
        .where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )
        
    return {
        "_id": doc.id,
        "user_id": str(doc.user_id),
        "filename": doc.filename,
        "file_type": doc.file_type,
        "file_url": doc.file_url,
        "extracted_text": doc.extracted_text,
        "status": doc.status,
        "summary": doc.summary,
        "smart_tags": doc.smart_tags,
        "insights": doc.insights,
        "created_at": doc.created_at.isoformat()
    }

@router.delete("/{doc_id}")
async def delete_document(doc_id: str, current_user = Depends(get_current_user), db = Depends(get_db)):
    """Delete a document record, local files, and its FAISS RAG index files."""
    result = await db.execute(
        select(Document)
        .where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )
        
    # 1. Clean local document file
    local_filename = os.path.basename(doc.file_url)
    local_file_path = os.path.join(settings.UPLOAD_DIR, local_filename)
    if os.path.exists(local_file_path):
        os.remove(local_file_path)
        
    # 2. Clean FAISS vector files
    RAGPipeline.delete_vector_store(doc_id)
    
    # 3. Clean database records
    await db.execute(delete(Document).where(Document.id == doc_id))
    await db.execute(delete(Chat).where(Chat.document_id == doc_id))
    await db.commit()
    
    return {"detail": "Document and all related indices successfully removed."}
