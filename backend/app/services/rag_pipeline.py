import os
import re
import json
import logging
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from app.core.config import settings
from typing import List, Dict, Tuple, Any

logger = logging.getLogger(__name__)

# Initialize local embedding model globally (lazy loaded)
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        logger.info("Loading sentence-transformers/all-MiniLM-L6-v2 model...")
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Model loaded successfully.")
    return _embedding_model

class SemanticChunk:
    def __init__(self, text: str, pages: List[int]):
        self.text = text
        self.pages = pages

class RAGPipeline:
    @staticmethod
    def split_into_sentences(text: str) -> List[Dict[str, Any]]:
        """
        Split document text into sentences while tracking their source page numbers.
        Looks for '--- Page X ---' headers to track pages.
        """
        # Regex to match page headers
        page_pattern = re.compile(r"--- Page (\d+) ---")
        
        lines = text.split("\n")
        current_page = 1
        sentences_with_page = []
        
        page_content_buffer = []
        
        for line in lines:
            match = page_pattern.match(line)
            if match:
                # Process buffer for previous page if exists
                if page_content_buffer:
                    page_text = " ".join(page_content_buffer)
                    # Simple sentence boundary split
                    page_sentences = re.split(r"(?<=[.!?])\s+", page_text)
                    for s in page_sentences:
                        if s.strip():
                            sentences_with_page.append({"text": s.strip(), "page": current_page})
                    page_content_buffer = []
                current_page = int(match.group(1))
            else:
                if line.strip():
                    page_content_buffer.append(line)
                    
        # Process any remaining text in buffer
        if page_content_buffer:
            page_text = " ".join(page_content_buffer)
            page_sentences = re.split(r"(?<=[.!?])\s+", page_text)
            for s in page_sentences:
                if s.strip():
                    sentences_with_page.append({"text": s.strip(), "page": current_page})
                    
        # If no page markers were found at all, treat the whole document as page 1
        if not sentences_with_page and text.strip():
            page_sentences = re.split(r"(?<=[.!?])\s+", text)
            for s in page_sentences:
                if s.strip():
                    sentences_with_page.append({"text": s.strip(), "page": 1})
                    
        return sentences_with_page

    @staticmethod
    def create_semantic_chunks(text: str, max_chunk_sentences: int = 5) -> List[SemanticChunk]:
        """
        Create chunks by grouping sentences based on cosine similarity transitions.
        """
        sentences_data = RAGPipeline.split_into_sentences(text)
        if not sentences_data:
            return []
            
        if len(sentences_data) <= 2:
            return [SemanticChunk(text=s["text"], pages=[s["page"]]) for s in sentences_data]

        model = get_embedding_model()
        sentences_text = [s["text"] for s in sentences_data]
        
        # Generate sentence embeddings
        embeddings = model.encode(sentences_text, convert_to_numpy=True)
        
        # Calculate cosine similarity between consecutive sentences
        # Normalize embeddings first for easy dot product cosine similarity
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1.0  # Avoid divide by zero
        normalized_embeddings = embeddings / norms
        
        similarities = []
        for i in range(len(normalized_embeddings) - 1):
            sim = np.dot(normalized_embeddings[i], normalized_embeddings[i+1])
            similarities.append(sim)
            
        # Cosine distance = 1 - similarity
        distances = [1.0 - sim for sim in similarities]
        
        # Threshold for semantic boundary (e.g., 85th percentile of distances)
        if distances:
            threshold = np.percentile(distances, 85)
        else:
            threshold = 0.5
            
        chunks = []
        current_chunk_sentences = []
        current_chunk_pages = set()
        
        for idx, sentence_info in enumerate(sentences_data):
            current_chunk_sentences.append(sentence_info["text"])
            current_chunk_pages.add(sentence_info["page"])
            
            # Check for boundary conditions:
            # 1. We reached the last sentence
            # 2. We exceed maximum suggested sentences
            # 3. The distance to the next sentence exceeds the threshold
            is_last = idx == len(sentences_data) - 1
            exceeds_len = len(current_chunk_sentences) >= max_chunk_sentences
            
            is_boundary = False
            if not is_last:
                is_boundary = distances[idx] > threshold
                
            if is_last or exceeds_len or is_boundary:
                chunk_text = " ".join(current_chunk_sentences)
                chunks.append(
                    SemanticChunk(
                        text=chunk_text,
                        pages=sorted(list(current_chunk_pages))
                    )
                )
                current_chunk_sentences = []
                current_chunk_pages = set()
                
        return chunks

    @staticmethod
    def build_vector_store(doc_id: str, extracted_text: str) -> bool:
        """
        Generate semantic chunks, embed them, build a FAISS index, and persist to disk.
        """
        try:
            chunks = RAGPipeline.create_semantic_chunks(extracted_text)
            if not chunks:
                logger.warning(f"No text extracted for document {doc_id} to build vector store.")
                return False
                
            model = get_embedding_model()
            chunk_texts = [c.text for c in chunks]
            
            # Embed chunks
            embeddings = model.encode(chunk_texts, convert_to_numpy=True)
            
            # Normalize for Inner Product (Cosine similarity)
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            normalized_embeddings = embeddings / norms
            
            # FAISS Flat IP Index
            dimension = 384  # MiniLM dimension
            index = faiss.IndexFlatIP(dimension)
            index.add(normalized_embeddings)
            
            # Save FAISS index
            index_path = os.path.join(settings.VECTORS_DIR, f"{doc_id}.index")
            faiss.write_index(index, index_path)
            
            # Save mapping metadata (vector ID -> chunk text and pages)
            meta_path = os.path.join(settings.VECTORS_DIR, f"{doc_id}.json")
            meta_data = []
            for i, chunk in enumerate(chunks):
                meta_data.append({
                    "vector_id": i,
                    "text": chunk.text,
                    "pages": chunk.pages
                })
                
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(meta_data, f, ensure_ascii=False, indent=2)
                
            logger.info(f"FAISS index and metadata successfully created for document {doc_id}.")
            return True
        except Exception as e:
            logger.error(f"Failed to build vector store for {doc_id}: {e}")
            return False

    @staticmethod
    def retrieve_context(doc_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieve the top_k matching chunks for a query from the document's FAISS index.
        """
        index_path = os.path.join(settings.VECTORS_DIR, f"{doc_id}.index")
        meta_path = os.path.join(settings.VECTORS_DIR, f"{doc_id}.json")
        
        if not os.path.exists(index_path) or not os.path.exists(meta_path):
            logger.error(f"Index or metadata files missing for document {doc_id}")
            return []
            
        try:
            # Read index and metadata
            index = faiss.read_index(index_path)
            with open(meta_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
                
            model = get_embedding_model()
            query_vector = model.encode([query], convert_to_numpy=True)
            
            # Normalize vector
            norm = np.linalg.norm(query_vector)
            if norm > 0:
                query_vector = query_vector / norm
                
            # Search index
            distances, indices = index.search(query_vector, min(top_k, index.ntotal))
            
            results = []
            for score, idx in zip(distances[0], indices[0]):
                if idx == -1:
                    continue
                # Retrieve mapping meta
                chunk_meta = metadata[int(idx)]
                results.append({
                    "text": chunk_meta["text"],
                    "pages": chunk_meta["pages"],
                    "score": float(score)
                })
                
            return results
        except Exception as e:
            logger.error(f"Failed to retrieve context for document {doc_id}: {e}")
            return []

    @staticmethod
    def delete_vector_store(doc_id: str):
        """Clean vector database files from disk."""
        index_path = os.path.join(settings.VECTORS_DIR, f"{doc_id}.index")
        meta_path = os.path.join(settings.VECTORS_DIR, f"{doc_id}.json")
        try:
            if os.path.exists(index_path):
                os.remove(index_path)
            if os.path.exists(meta_path):
                os.remove(meta_path)
            logger.info(f"Cleaned vector store for document {doc_id}.")
        except Exception as e:
            logger.error(f"Error deleting vector store for {doc_id}: {e}")
