import os
import json
import base64
import logging
from groq import AsyncGroq
from app.core.config import settings

logger = logging.getLogger(__name__)

class GroqService:
    def __init__(self):
        # Fallback to local env check in case configuration doesn't parse it
        api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
        if not api_key:
            logger.warning("GROQ_API_KEY is not configured. AI functions will fail.")
        self.client = AsyncGroq(api_key=api_key)

    @staticmethod
    def _encode_image(image_path: str) -> str:
        """Encode local image to base64 for Vision API calls."""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")

    async def correct_ocr_with_vision(self, image_path: str, raw_ocr: str) -> str:
        """Use Groq Llama 3.2 Vision to clean up Tesseract output against the original image."""
        try:
            base64_image = self._encode_image(image_path)
            
            prompt = (
                f"You are a multimodal document refinement assistant. Below is a raw text "
                f"extraction from Tesseract OCR for the attached image. Compare the text and correct any "
                f"spelling errors, fix broken layout, reconstruct markdown tables, and decipher any "
                f"handwritten text. Do not summarize or add commentary. Return ONLY the reconstructed text.\n\n"
                f"Raw OCR output:\n{raw_ocr}"
            )
            
            response = await self.client.chat.completions.create(
                model="llama-3.2-11b-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                temperature=0.1
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq OCR Vision correction failed: {e}")
            return raw_ocr  # Fallback to raw OCR text if API call fails

    async def generate_summary(self, document_text: str) -> dict:
        """Generate structured summaries (TL;DR, Bullets, Action Items, Deep Dive)."""
        prompt = (
            "Analyze the document text and produce a summary object in JSON. "
            "The JSON must contain these exact keys:\n"
            "1. 'tldr': A single, punchy sentence summarizing the entire text.\n"
            "2. 'bullets': An array of 3-7 key points extracted from the text.\n"
            "3. 'action_items': An array of specific next steps, deadlines, or actionable tasks. "
            "If no action items are present, return an empty array.\n"
            "4. 'detailed': A comprehensive paragraph summarizing the background, methods, or core contents.\n\n"
            f"Document Text:\n{document_text[:20000]}"
        )
        
        try:
            response = await self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a precise data extraction agent. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            data = json.loads(response.choices[0].message.content)
            return {
                "tldr": data.get("tldr", ""),
                "bullets": data.get("bullets", []),
                "action_items": data.get("action_items", []),
                "detailed": data.get("detailed", "")
            }
        except Exception as e:
            logger.error(f"Groq summary generation failed: {e}")
            return {
                "tldr": "Summary compilation failed.",
                "bullets": ["Could not parse key insights."],
                "action_items": [],
                "detailed": "Detailed summarization encountered an error."
            }

    async def generate_insights(self, document_text: str) -> dict:
        """Extract smart tags, sentiment, urgency, and core entities."""
        prompt = (
            "Analyze the document text and extract analytical insights in JSON format. "
            "The JSON must contain these exact keys:\n"
            "1. 'urgency_level': String containing either 'HIGH', 'MEDIUM', or 'LOW'. Base this on mentions of deadlines, liabilities, or action requests.\n"
            "2. 'sentiment': String describing the overall tone (e.g., 'Positive', 'Negative', 'Formal', 'Neutral').\n"
            "3. 'legal_risks': An array of liability statements, indemnity disclosures, or commercial risks found. If none, return an empty array.\n"
            "4. 'smart_tags': An array of 3-5 categories or tags suited for organizing this file (e.g. 'Invoice', 'Legal Contract', 'Resume', 'Scientific Paper').\n"
            "5. 'detected_entities': An object with arrays for keys 'dates', 'monetary_values', and 'organizations'.\n\n"
            f"Document Text:\n{document_text[:15000]}"
        )
        
        try:
            response = await self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are an analytical document auditor. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            data = json.loads(response.choices[0].message.content)
            return {
                "urgency_level": data.get("urgency_level", "LOW"),
                "sentiment": data.get("sentiment", "Neutral"),
                "legal_risks": data.get("legal_risks", []),
                "smart_tags": data.get("smart_tags", []),
                "detected_entities": data.get("detected_entities", {"dates": [], "monetary_values": [], "organizations": []})
            }
        except Exception as e:
            logger.error(f"Groq insights generation failed: {e}")
            return {
                "urgency_level": "LOW",
                "sentiment": "Neutral",
                "legal_risks": [],
                "smart_tags": [],
                "detected_entities": {"dates": [], "monetary_values": [], "organizations": []}
            }

    async def detect_fake_document(self, document_text: str, filename: str) -> dict:
        """Run metadata and logical sanity forensic checks on text."""
        prompt = (
            "Analyze the following document content to detect signs of digital forgery, fake certificates, "
            "invoice manipulation, math discrepancies, or layout template mismatch. "
            "Perform logical checks: check if dates flow sequentially, verify table line additions sum up "
            "correctly, and identify abnormal wording. Return a JSON object with these exact keys:\n"
            "1. 'is_fake': boolean indicating high probability of tampering/forgery.\n"
            "2. 'fake_reasons': array of descriptive reasons if flagged (empty if not fake).\n"
            "3. 'tamper_score': float score from 0.0 (perfect integrity) to 1.0 (obvious fake).\n\n"
            f"Filename: {filename}\n"
            f"Document Text:\n{document_text[:15000]}"
        )
        
        try:
            response = await self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a document forensics expert. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            data = json.loads(response.choices[0].message.content)
            return {
                "is_fake": data.get("is_fake", False),
                "fake_reasons": data.get("fake_reasons", []),
                "tamper_score": data.get("tamper_score", 0.0)
            }
        except Exception as e:
            logger.error(f"Fake document detection failed: {e}")
            return {
                "is_fake": False,
                "fake_reasons": ["Forensic script execution error."],
                "tamper_score": 0.0
            }

    async def analyze_resume(self, resume_text: str, jd_text: str) -> dict:
        """Assess candidate resume against target Job Description."""
        prompt = (
            "Act as a professional technical recruiter and ATS software analyzer. "
            "Match the resume text against the provided job description text. "
            "Return a JSON object with these exact keys:\n"
            "1. 'ats_score': integer from 0 to 100 indicating percentage match.\n"
            "2. 'matching_skills': array of skills found in both resume and JD.\n"
            "3. 'missing_skills': array of skills requested in JD but missing in resume.\n"
            "4. 'improvement_suggestions': array of specific action items to optimize the resume.\n"
            "5. 'recommended_roles': array of candidate roles suitable based on resume strengths.\n\n"
            f"Job Description:\n{jd_text}\n\n"
            f"Resume Text:\n{resume_text}"
        )
        
        try:
            response = await self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are an ATS assessment agent. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"ATS resume analysis failed: {e}")
            return {
                "ats_score": 0,
                "matching_skills": [],
                "missing_skills": ["ATS execution error."],
                "improvement_suggestions": ["Re-run analysis."],
                "recommended_roles": []
            }

    async def chat_with_context(self, query: str, context: str, history: list) -> str:
        """Execute RAG synthesis with source context and history."""
        # Convert history format to OpenAI messages list
        formatted_messages = [
            {
                "role": "system",
                "content": (
                    "You are DocMind AI, a highly accurate document intelligence assistant. "
                    "You answer user queries using ONLY the context provided below.\n\n"
                    "Rules:\n"
                    "1. Base your answer solely on the provided Context. If the context does not contain the information, "
                    "say 'I cannot find this information in the uploaded document.'\n"
                    "2. Cite your sources using page numbers where applicable (e.g. '[Page 4]').\n"
                    "3. Keep your output clear, structured, and direct.\n\n"
                    f"Context:\n{context}"
                )
            }
        ]
        
        # Add historical messages (limit to last 10 messages for token budget)
        for msg in history[-10:]:
            formatted_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
            
        # Add current query
        formatted_messages.append({
            "role": "user",
            "content": query
        })
        
        try:
            response = await self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=formatted_messages,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq chat query failed: {e}")
            return f"Error communicating with AI service: {e}"

# Instantiate global service
groq_service = GroqService()
