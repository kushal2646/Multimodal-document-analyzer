from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from app.core.config import settings
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = settings.get_database_url()

# Strip query parameters that cause TypeError in asyncpg, and pass them via connect_args
connect_args = {}
clean_url = DATABASE_URL
if "neon.tech" in DATABASE_URL or "sslmode" in DATABASE_URL or "channel_binding" in DATABASE_URL:
    connect_args = {"ssl": "require"}
    if "?" in clean_url:
        base_url, query_str = clean_url.split("?", 1)
        params = [p for p in query_str.split("&") if not (p.startswith("sslmode") or p.startswith("channel_binding"))]
        if params:
            clean_url = f"{base_url}?{'&'.join(params)}"
        else:
            clean_url = base_url


# Initialize engine and sessionmaker
engine = create_async_engine(clean_url, connect_args=connect_args, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()

# ----------------- PostgreSQL Schema Models -----------------

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    settings = Column(JSON, default=lambda: {"theme": "dark", "voice_output": True})
    created_at = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, index=True)  # doc_id generated string
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    extracted_text = Column(Text, default="")
    status = Column(String, default="processing")
    summary = Column(JSON, default=lambda: {
        "tldr": "",
        "bullets": [],
        "action_items": [],
        "detailed": ""
    })
    smart_tags = Column(JSON, default=list)
    insights = Column(JSON, default=lambda: {
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
    })
    created_at = Column(DateTime, default=datetime.utcnow)

class Chat(Base):
    __tablename__ = "chats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    messages = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ----------------- DB Lifecycles & Dependency Injection -----------------

async def connect_to_mongo():
    """Initializes tables on server startup (legacy name kept for main.py)."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Successfully connected to PostgreSQL database and verified tables.")
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL tables: {e}")
        raise e

async def close_mongo_connection():
    """Cleans up engine resources on server shutdown."""
    await engine.dispose()
    logger.info("PostgreSQL database connection pool closed.")

async def get_db():
    """FastAPI async dependency session generator."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
