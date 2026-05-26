from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SourceCitation(BaseModel):
    page_number: int = Field(..., description="1-indexed page where context was found")
    snippet: str = Field(..., description="Extract of text context retrieved")

class Message(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text content")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sources: Optional[List[SourceCitation]] = Field(default=None, description="RAG source references if role is assistant")

class ChatResponse(BaseModel):
    id: int = Field(..., description="PostgreSQL primary key chat ID")
    user_id: int = Field(..., description="User owner primary key ID")
    document_id: str = Field(..., description="Document string ID")
    messages: List[Message] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
