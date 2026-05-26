from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select, func
from app.core.database import get_db, Document
from app.api.auth import get_current_user
from datetime import datetime, timezone
import re

router = APIRouter(prefix="/analytics", tags=["Dashboard Analytics"])

@router.get("/metrics")
async def get_dashboard_metrics(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Compile aggregated metrics for the user analytics dashboard panels."""
    user_id = current_user.id
    
    # Query total documents
    count_q = select(func.count(Document.id)).where(Document.user_id == user_id)
    total_docs = (await db.execute(count_q)).scalar() or 0
    
    if total_docs == 0:
        return {
            "total_documents": 0,
            "total_pages": 0,
            "urgency_distribution": {"HIGH": 0, "MEDIUM": 0, "LOW": 0},
            "file_type_distribution": {},
            "recent_activity": [],
            "tag_cloud": []
        }
        
    # Fetch all user documents
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()
    
    total_pages = 0
    urgency_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    file_type_counts = {}
    tag_frequencies = {}
    recent_activity = []
    
    for doc in documents:
        # Estimate page count
        extracted_text = doc.extracted_text or ""
        page_matches = re.findall(r"--- Page \d+ ---", extracted_text)
        page_count = len(page_matches) if page_matches else 1
        total_pages += page_count
        
        # Urgency
        insights = doc.insights or {}
        urgency = insights.get("urgency_level", "LOW").upper()
        if urgency in urgency_counts:
            urgency_counts[urgency] += 1
        else:
            urgency_counts["LOW"] += 1
            
        # File type distribution
        mime = doc.file_type or "unknown"
        mime_label = mime.split('/')[-1].upper()
        if "word" in mime.lower():
            mime_label = "DOCX"
        elif "plain" in mime.lower():
            mime_label = "TXT"
        file_type_counts[mime_label] = file_type_counts.get(mime_label, 0) + 1
        
        # Smart tags
        tags = doc.smart_tags or []
        for tag in tags:
            tag_frequencies[tag] = tag_frequencies.get(tag, 0) + 1
            
        # Add to recent activity list
        if len(recent_activity) < 5:
            recent_activity.append({
                "id": doc.id,
                "filename": doc.filename,
                "file_type": mime_label,
                "status": doc.status or "ready",
                "created_at": doc.created_at.isoformat()
            })
            
    # Sort tags by frequency and return top 15
    sorted_tags = sorted(tag_frequencies.items(), key=lambda x: x[1], reverse=True)[:15]
    tag_cloud = [{"text": tag, "value": count} for tag, count in sorted_tags]
    
    return {
        "total_documents": total_docs,
        "total_pages": total_pages,
        "urgency_distribution": urgency_counts,
        "file_type_distribution": file_type_counts,
        "recent_activity": recent_activity,
        "tag_cloud": tag_cloud
    }

@router.get("/report/{doc_id}", response_class=PlainTextResponse)
async def download_intelligence_report(
    doc_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Compile document analytical summaries and insights into a downloadable Markdown report."""
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
        
    if doc.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is still processing. Report cannot be compiled yet."
        )
        
    summary = doc.summary or {}
    insights = doc.insights or {}
    integrity = insights.get("integrity", {})
    
    # Compile Markdown document content
    report_md = f"""# DocMind AI Analysis Report
**Generated on**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
**Document Filename**: {doc.filename}
**File Type**: {doc.file_type}
---

## 1. Executive Summary
### TL;DR
{summary.get('tldr', 'No summary available.')}

### Core Overview
{summary.get('detailed', 'No detail view compiled.')}

---

## 2. Key Insights & Takeaways
### Key Findings
"""
    for bullet in summary.get('bullets', []):
        report_md += f"- {bullet}\n"
        
    report_md += "\n### Action Items & Obligations\n"
    action_items = summary.get('action_items', [])
    if action_items:
        for item in action_items:
            report_md += f"- [ ] {item}\n"
    else:
        report_md += "*No action items detected.*\n"
        
    report_md += f"""
---

## 3. Metadata Forensic Analysis
- **Tampering Status**: {"TAMPERED / FAKE DETECTED" if integrity.get('is_fake') else "CLEAN / VERIFIED INTEGRITY"}
- **Integrity Score**: {100 - int(integrity.get('tamper_score', 0.0) * 100)}%
- **Identified Issues**:
"""
    reasons = integrity.get('fake_reasons', [])
    if reasons:
        for reason in reasons:
            report_md += f"  - {reason}\n"
    else:
        report_md += "  - None. No structural or logical anomalies detected.\n"
        
    report_md += f"""
---

## 4. Risks & Classifications
- **Document Urgency Level**: {insights.get('urgency_level', 'LOW')}
- **Emotional/Text Tone**: {insights.get('sentiment', 'Neutral')}
- **Extracted Legal/Commercial Risks**:
"""
    risks = insights.get('legal_risks', [])
    if risks:
        for risk in risks:
            report_md += f"- {risk}\n"
    else:
        report_md += "*No liability/indemnification risks identified.*\n"
        
    report_md += "\n### Identified Entities\n"
    entities = insights.get('detected_entities', {})
    
    report_md += "- **Dates mentioned**: " + (", ".join(entities.get('dates', [])) if entities.get('dates') else "None") + "\n"
    report_md += "- **Monetary Values**: " + (", ".join(entities.get('monetary_values', [])) if entities.get('monetary_values') else "None") + "\n"
    report_md += "- **Organizations**: " + (", ".join(entities.get('organizations', [])) if entities.get('organizations') else "None") + "\n"
    
    smart_tags_str = ", ".join(doc.smart_tags or [])
    report_md += f"\n- **Smart Tags**: {smart_tags_str}\n"
    
    headers = {
        "Content-Disposition": f"attachment; filename=DocMind_AI_Report_{doc_id}.md"
    }
    return PlainTextResponse(content=report_md, headers=headers)
