from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
import time

from sqlalchemy.orm import Session
from app.database import get_db, engine, Base
from app.models import User, Tenant, QueryLog
from app.auth import UserLogin, verify_password, get_password_hash, create_access_token, get_current_user, Token, TokenData, timedelta, ACCESS_TOKEN_EXPIRE_MINUTES
from app.ai_service import ask_question, embed_pdf, embed_url, get_db_stats, reset_vectorstore

# Create database tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="BrainDesk Backend")

# Mount the static files for the widget
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIDGET_DIR = os.path.join(os.path.dirname(BASE_DIR), "widget")
app.mount("/static", StaticFiles(directory=WIDGET_DIR), name="static")

# Enable CORS for the frontend and widget
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    question: str
    widget_id: Optional[str] = "default"
    history: Optional[List[ChatMessage]] = []

class ScrapeRequest(BaseModel):
    url: str
    widget_id: Optional[str] = "default"

# --- Authentication & Seeding ---

@app.post("/api/seed")
def seed_demo_users(db: Session = Depends(get_db)):
    """Creates demo admin and client users if they don't exist."""
    admin = db.query(User).filter(User.email == "admin@braindesk.ai").first()
    if not admin:
        admin = User(email="admin@braindesk.ai", hashed_password=get_password_hash("admin123"), role="admin")
        db.add(admin)
    
    client = db.query(User).filter(User.email == "client@hireloop.ai").first()
    if not client:
        client = User(email="client@hireloop.ai", hashed_password=get_password_hash("client123"), role="client")
        db.add(client)
        
    db.commit()
    return {"message": "Demo users seeded: admin@braindesk.ai / admin123, client@hireloop.ai / client123"}


@app.post("/api/login", response_model=Token)
def login_for_access_token(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_credentials.email).first()
    
    # Simple mock check for the demo: if email contains admin, act like admin.
    if not user:
        if "admin" in user_credentials.email.lower():
            user = User(email=user_credentials.email, hashed_password=get_password_hash(user_credentials.password), role="admin")
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user = User(email=user_credentials.email, hashed_password=get_password_hash(user_credentials.password), role="client")
            db.add(user)
            db.commit()
            db.refresh(user)
            
    if not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "email": user.email}

@app.get("/api/me")
def read_users_me(current_user: TokenData = Depends(get_current_user)):
    return current_user

# --- Tenants (Projects) ---

@app.get("/api/projects")
def get_projects(db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    # In a real app, clients only see their projects. Admin sees all.
    # For demo, if client, return only their hardcoded tenant.
    if current_user.role == "client":
        return [{"id": "proj_hireloop", "name": "HireLoop Ai"}]
    else:
        return [
            {"id": "proj_main_biz", "name": "Main Business Workspace"},
            {"id": "proj_hireloop", "name": "HireLoop Ai"},
            {"id": "proj_technova", "name": "TechNova Corp"}
        ]

# --- Analytics with Postgres ---

@app.get("/analytics")
def analytics_endpoint(widget_id: Optional[str] = "default", db: Session = Depends(get_db)):
    query = db.query(QueryLog)
    if widget_id and widget_id != "all":
        query = query.filter(QueryLog.widget_id == widget_id)
        
    logs = query.order_by(QueryLog.timestamp.desc()).all()
    
    total_queries = len(logs)
    unanswered_logs = [l for l in logs if l.is_unanswered]
    total_unanswered = len(unanswered_logs)
    total_answered = total_queries - total_unanswered
    
    resolution_rate = round((total_answered / total_queries * 100), 1) if total_queries > 0 else 100.0
    
    unanswered_counts = {}
    for l in unanswered_logs:
        q = l.question.strip()
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
        "recent_logs": [
            {
                "id": log.id,
                "question": log.question,
                "answer": log.answer,
                "is_unanswered": log.is_unanswered,
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else None
            } for log in logs[:50]
        ]
    }

@app.post("/analytics/clear")
def clear_analytics_endpoint(widget_id: Optional[str] = "default", db: Session = Depends(get_db)):
    query = db.query(QueryLog)
    if widget_id and widget_id != "all":
        query = query.filter(QueryLog.widget_id == widget_id)
    query.delete()
    db.commit()
    return {"status": "success", "message": f"Analytics cleared for '{widget_id}'."}

# --- Core Logic ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "BrainDesk Backend is running with PostgreSQL!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/stats")
def stats_endpoint(widget_id: Optional[str] = "default"):
    return get_db_stats(widget_id=widget_id)

@app.post("/reset")
def reset_endpoint(widget_id: Optional[str] = "default"):
    res = reset_vectorstore(widget_id=widget_id)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Failed to reset vector database"))
    return res

@app.post("/chat")
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    widget_id = request.widget_id or "default"
    answer = ask_question(request.question, widget_id=widget_id)
    
    # Detect unanswered
    fallback_indicators = ["don't have that information", "dont have that information", "not contained within the context"]
    is_unanswered = any(indicator in answer.lower() for indicator in fallback_indicators)
    
    # Save to Postgres
    try:
        new_log = QueryLog(
            widget_id=widget_id,
            question=request.question.strip(),
            answer=answer.strip(),
            is_unanswered=is_unanswered
        )
        db.add(new_log)
        db.commit()
    except Exception as e:
        print(f"Postgres Analytics Logging Error: {e}")
        
    return {"answer": answer, "widget_id": widget_id, "is_unanswered": is_unanswered}

@app.post("/scrape")
def scrape_endpoint(request: ScrapeRequest):
    if not request.url or not request.url.strip():
        raise HTTPException(status_code=400, detail="Website URL is required.")
        
    result = embed_url(url=request.url.strip(), widget_id=request.widget_id or "default")
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to scrape and embed URL"))
        
    return {
        "status": "success", 
        "message": f"Successfully scraped '{result.get('title', result['source'])}' and added {result['chunks_added']} chunks to BrainDesk brain.", 
        "widget_id": request.widget_id,
        "source": result["source"]
    }

@app.post("/upload")
async def upload_document(file: UploadFile = File(...), widget_id: Optional[str] = "default"):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    temp_dir = os.path.join(BASE_DIR, "scripts", "temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    result = embed_pdf(file_path, widget_id=widget_id or "default")
    
    if os.path.exists(file_path):
        os.remove(file_path)
        
    if result["success"]:
        return {"status": "success", "message": f"Successfully processed {file.filename} and added {result['chunks_added']} chunks to your BrainDesk brain (Tenant: {widget_id}).", "widget_id": widget_id}
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Unknown error occurred"))
