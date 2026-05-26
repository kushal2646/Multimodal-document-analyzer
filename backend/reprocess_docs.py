# backend/reprocess_docs.py
import asyncio
import os
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, Document, settings
from app.api.documents import process_document_task

async def reprocess_all():
    print("Connecting to database...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document))
        documents = result.scalars().all()
        
        print(f"Found {len(documents)} documents in the database.")
        
        for doc in documents:
            print(f"\nProcessing document: {doc.filename} (ID: {doc.id})")
            
            # Reconstruct file path from file_url (e.g. /uploads/uuid.pdf -> ./uploads/uuid.pdf)
            filename = os.path.basename(doc.file_url)
            file_path = os.path.join(settings.UPLOAD_DIR, filename)
            
            if not os.path.exists(file_path):
                print(f"ERROR: File does not exist at {file_path}")
                continue
                
            print(f"File found at: {file_path}")
            print(f"MIME type: {doc.file_type}")
            
            try:
                # Trigger the processing pipeline
                await process_document_task(
                    doc_id=doc.id,
                    file_path=file_path,
                    mime_type=doc.file_type,
                    user_id=doc.user_id
                )
                print(f"SUCCESS: Finished processing for {doc.filename}")
            except Exception as e:
                print(f"FAILED: Error processing {doc.filename}: {e}")

if __name__ == "__main__":
    asyncio.run(reprocess_all())
