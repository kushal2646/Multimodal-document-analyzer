from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from app.core.database import get_db, Document
from app.api.auth import get_current_user
from app.services.groq_client import groq_service

router = APIRouter(prefix="/insights", tags=["Advanced AI Insights"])

class ResumeJDAnalysisPayload(BaseModel):
    doc_id: str = Field(..., description="Document ID of the uploaded resume PDF/DOCX")
    job_description: str = Field(..., description="Text content of target job description to match against")

@router.post("/resume")
async def analyze_resume_ats(
    payload: ResumeJDAnalysisPayload,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Analyze a resume document against a job description and generate ATS metrics."""
    user_id = current_user.id
    
    # 1. Fetch document and confirm it belongs to the user
    result = await db.execute(
        select(Document)
        .where(Document.id == payload.doc_id, Document.user_id == user_id)
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )
        
    resume_text = doc.extracted_text or ""
    if not resume_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document content is empty or still processing."
        )
        
    # 2. Trigger ATS comparison using Groq Llama-3.3-70b-versatile
    jd_clean = "".join(c for c in payload.job_description if not (0xD800 <= ord(c) <= 0xDFFF))
    ats_results = await groq_service.analyze_resume(resume_text, jd_clean)
    return ats_results

@router.get("/fake-check/{doc_id}")
async def get_fake_document_status(
    doc_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Retrieve EXIF, alignment, and semantic tamper checks of a document."""
    try:
        user_id = current_user.id
        result = await db.execute(
            select(Document)
            .where(Document.id == doc_id, Document.user_id == user_id)
        )
        doc = result.scalar_one_or_none()
        
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or access denied."
            )
            
        insights = doc.insights or {}
        integrity_insights = insights.get("integrity", {
            "is_fake": False,
            "fake_reasons": ["Analysis not available."],
            "tamper_score": 0.0
        })
        
        return integrity_insights
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error retrieving forensic details."
        )

@router.get("/risks/{doc_id}")
async def get_legal_risks_and_urgency(
    doc_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Retrieve legal liability tags, urgency level, and financial obligations of a document."""
    try:
        user_id = current_user.id
        result = await db.execute(
            select(Document)
            .where(Document.id == doc_id, Document.user_id == user_id)
        )
        doc = result.scalar_one_or_none()
        
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or access denied."
            )
            
        insights = doc.insights or {}
        return {
            "urgency_level": insights.get("urgency_level", "LOW"),
            "sentiment": insights.get("sentiment", "Neutral"),
            "legal_risks": insights.get("legal_risks", []),
            "detected_entities": insights.get("detected_entities", {
                "dates": [],
                "monetary_values": [],
                "organizations": []
            })
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error resolving risk insights."
        )
