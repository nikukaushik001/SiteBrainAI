import os
import json
import time
from typing import List, Dict, Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
ANALYTICS_FILE = os.path.join(DATA_DIR, "analytics.json")

def _ensure_storage_exists():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(ANALYTICS_FILE):
        with open(ANALYTICS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)

def _load_logs() -> List[Dict[str, Any]]:
    _ensure_storage_exists()
    try:
        with open(ANALYTICS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def _save_logs(logs: List[Dict[str, Any]]):
    _ensure_storage_exists()
    try:
        with open(ANALYTICS_FILE, "w", encoding="utf-8") as f:
            json.dump(logs, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving analytics logs: {e}")

def log_query(widget_id: str, question: str, answer: str) -> Dict[str, Any]:
    """Logs a user query and detects if it was unanswered based on LLM response."""
    logs = _load_logs()
    
    # Unanswered fallback keywords
    fallback_indicators = [
        "don't have that information",
        "dont have that information",
        "not contained within the context",
        "please contact support",
        "system error"
    ]
    
    is_unanswered = any(indicator in answer.lower() for indicator in fallback_indicators)
    
    entry = {
        "id": f"q_{int(time.time() * 1000)}",
        "widget_id": widget_id or "default",
        "question": question.strip(),
        "answer": answer.strip(),
        "is_unanswered": is_unanswered,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    logs.insert(0, entry) # prepend newest first
    # Keep up to 1000 recent logs
    if len(logs) > 1000:
        logs = logs[:1000]
        
    _save_logs(logs)
    return entry

def get_analytics(widget_id: str = "default") -> Dict[str, Any]:
    """Calculates aggregate analytics metrics for a specific widget_id tenant."""
    logs = _load_logs()
    
    # Filter by tenant
    tenant_logs = [l for l in logs if l.get("widget_id") == widget_id or (widget_id == "all")]
    
    total_queries = len(tenant_logs)
    unanswered_logs = [l for l in tenant_logs if l.get("is_unanswered")]
    total_unanswered = len(unanswered_logs)
    total_answered = total_queries - total_unanswered
    
    resolution_rate = round((total_answered / total_queries * 100), 1) if total_queries > 0 else 100.0
    
    # Group unanswered questions by similarity / query string
    unanswered_counts = {}
    for l in unanswered_logs:
        q = l.get("question", "").strip()
        if q:
            unanswered_counts[q] = unanswered_counts.get(q, 0) + 1
            
    top_unanswered = [
        {"question": q, "count": count}
        for q, count in sorted(unanswered_counts.items(), key=lambda item: item[1], reverse=True)[:10]
    ]
    
    return {
        "widget_id": widget_id,
        "total_queries": total_queries,
        "total_answered": total_answered,
        "total_unanswered": total_unanswered,
        "resolution_rate_pct": resolution_rate,
        "top_unanswered": top_unanswered,
        "recent_logs": tenant_logs[:50] # return top 50 recent logs
    }

def clear_analytics(widget_id: str = "default") -> bool:
    """Clears query logs for a specific widget_id tenant."""
    logs = _load_logs()
    if widget_id == "all":
        logs = []
    else:
        logs = [l for l in logs if l.get("widget_id") != widget_id]
    _save_logs(logs)
    return True
