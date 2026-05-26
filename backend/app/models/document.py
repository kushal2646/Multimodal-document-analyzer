from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

class DocumentSummary(BaseModel):
    tldr: str = Field(default="", description="1-sentence executive summary")
    bullets: List[str] = Field(default_factory=list, description="Key bullet points")
    action_items: List[str] = Field(default_factory=list, description="Extracted actionable tasks")
    detailed: str = Field(default="", description="Deep technical analysis or overview")

class DetectedEntities(BaseModel):
    dates: List[str] = Field(default_factory=list)
    monetary_values: List[str] = Field(default_factory=list)
    organizations: List[str] = Field(default_factory=list)

class DocumentIntegrity(BaseModel):
    is_fake: bool = Field(default=False, description="Whether structural tampering was flagged")
    fake_reasons: List[str] = Field(default_factory=list, description="Forensic issues spotted")
    tamper_score: float = Field(default=0.0, description="Tampering probability from 0 to 1")

class DocumentInsights(BaseModel):
    urgency_level: str = Field(default="LOW", description="HIGH, MEDIUM, or LOW urgency indicator")
    sentiment: str = Field(default="Neutral", description="General tone of the document text")
    legal_risks: List[str] = Field(default_factory=list, description="Extracted legal exposures/liability points")
    detected_entities: DetectedEntities = Field(default_factory=DetectedEntities)
    integrity: DocumentIntegrity = Field(default_factory=DocumentIntegrity)

class DocumentResponse(BaseModel):
    id: str = Field(..., description="Unique document string ID")
    user_id: int = Field(..., description="PostgreSQL primary key user ID")
    filename: str
    file_type: str
    file_url: str
    extracted_text: str = ""
    status: str = "processing"
    summary: DocumentSummary = Field(default_factory=DocumentSummary)
    smart_tags: List[str] = Field(default_factory=list)
    insights: DocumentInsights = Field(default_factory=DocumentInsights)
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
