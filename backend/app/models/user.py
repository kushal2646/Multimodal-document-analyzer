from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserSettings(BaseModel):
    theme: str = "dark"
    voice_output: bool = True

class UserBase(BaseModel):
    email: str = Field(..., description="User's email address")
    full_name: str = Field(..., description="User's full name")
    settings: UserSettings = Field(default_factory=UserSettings)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Clear-text password (min 6 characters)")

class UserResponse(BaseModel):
    id: int = Field(..., description="PostgreSQL primary key ID")
    email: str
    full_name: str
    settings: UserSettings
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[str] = None
