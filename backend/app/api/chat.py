from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from app.core.database import get_db, Document, Chat
from app.api.auth import get_current_user
from app.services.rag_pipeline import RAGPipeline
from app.services.groq_client import groq_service

router = APIRouter(prefix="/chat", tags=["Document Chat"])

class ChatMessagePayload(BaseModel):
    message: str = Field(..., description="The question or prompt to ask the document")

@router.post("/{doc_id}")
async def ask_document_question(
    doc_id: str,
    payload: ChatMessagePayload,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Ask a question about a document. Performs semantic search in FAISS and generates an answer with page sources."""
    user_id = current_user.id
    
    # 1. Validate document ownership
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
        
    if doc.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is still being processed. Please wait until indexing is complete."
        )
        
    # 2. Retrieve top-k semantic chunks from FAISS vector store
    retrieved_chunks = RAGPipeline.retrieve_context(doc_id, payload.message, top_k=5)
    
    context_str = ""
    for idx, chunk in enumerate(retrieved_chunks):
        pages_str = ", ".join(map(str, chunk["pages"]))
        context_str += f"<Source page={pages_str} index={idx}>\n{chunk['text']}\n</Source>\n\n"
        
    # 3. Retrieve or create chat history session
    chat_result = await db.execute(
        select(Chat)
        .where(Chat.document_id == doc_id, Chat.user_id == user_id)
    )
    chat_session = chat_result.scalar_one_or_none()
    
    if not chat_session:
        chat_session = Chat(
            user_id=user_id,
            document_id=doc_id,
            messages=[],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(chat_session)
        await db.commit()
        await db.refresh(chat_session)
        
    # 4. Generate answer using Groq with history and context
    history = list(chat_session.messages or [])
    ai_answer = await groq_service.chat_with_context(payload.message, context_str, history)
    
    # 5. Build source citations array
    sources = []
    seen_snippets = set()
    for chunk in retrieved_chunks:
        snippet_key = chunk["text"][:100]
        if snippet_key not in seen_snippets:
            seen_snippets.add(snippet_key)
            for page in chunk["pages"]:
                sources.append({
                    "page_number": page,
                    "snippet": chunk["text"]
                })
                
    # 6. Save messages to history
    user_message = {
        "role": "user",
        "content": payload.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    assistant_message = {
        "role": "assistant",
        "content": ai_answer,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sources": sources
    }
    
    # Explicitly re-assign list to trigger SQLAlchemy JSON mutability changes check
    new_messages = history + [user_message, assistant_message]
    chat_session.messages = new_messages
    chat_session.updated_at = datetime.utcnow()
    
    db.add(chat_session)
    await db.commit()
    
    return {
        "user_message": user_message,
        "assistant_message": assistant_message
    }

@router.get("/{doc_id}/history")
async def get_chat_history(
    doc_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get the full conversational logs for a specific document and user."""
    try:
        user_id = current_user.id
        result = await db.execute(
            select(Chat)
            .where(Chat.document_id == doc_id, Chat.user_id == user_id)
        )
        chat_session = result.scalar_one_or_none()
        
        if not chat_session:
            return []
            
        return list(chat_session.messages or [])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid query or error retrieving chat history."
        )
