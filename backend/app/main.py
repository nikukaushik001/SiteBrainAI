from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
import csv
import io

from sqlalchemy.orm import Session
from app.database import get_db, engine, Base
from app.models import User, Tenant, QueryLog, Lead
from app.auth import (
    UserLogin, verify_password, get_password_hash,
    create_access_token, get_current_user,
    Token, TokenData, timedelta, ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.ai_service import ask_question, embed_pdf, embed_url, get_db_stats, reset_vectorstore, delete_document_source


# Create database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="BrainDesk Backend", version="1.0.0")

# Mount static widget files
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIDGET_DIR = os.path.join(os.path.dirname(BASE_DIR), "widget")
if os.path.isdir(WIDGET_DIR):
    app.mount("/static", StaticFiles(directory=WIDGET_DIR), name="static")

# CORS — allow frontend and widget origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    question: str
    widget_id: Optional[str] = "default"
    history: Optional[List[ChatMessage]] = []

class ScrapeRequest(BaseModel):
    url: str
    widget_id: Optional[str] = "default"

class UserRegister(BaseModel):
    email: str
    password: str

class TenantCreate(BaseModel):
    id: str
    name: str

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None

class LeadCreate(BaseModel):
    widget_id: Optional[str] = "default"
    name: str
    email: str
    phone: Optional[str] = None
    notes: Optional[str] = None

class DocDeleteRequest(BaseModel):
    source: str
    widget_id: Optional[str] = "default"


# ── Auth & User Management ────────────────────────────────────────────────────

@app.post("/api/seed", tags=["Auth"])
def seed_demo_users(db: Session = Depends(get_db)):
    """Creates demo admin and client users if they don't already exist."""
    created = []

    admin = db.query(User).filter(User.email == "admin@braindesk.ai").first()
    if not admin:
        db.add(User(
            email="admin@braindesk.ai",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        ))
        created.append("admin@braindesk.ai")

    client = db.query(User).filter(User.email == "client@hireloop.ai").first()
    if not client:
        db.add(User(
            email="client@hireloop.ai",
            hashed_password=get_password_hash("client123"),
            role="client"
        ))
        created.append("client@hireloop.ai")

    db.commit()
    return {
        "message": "Seed complete.",
        "created": created,
        "demo_credentials": [
            {"email": "admin@braindesk.ai", "password": "admin123", "role": "admin"},
            {"email": "client@hireloop.ai", "password": "client123", "role": "client"},
        ]
    }


@app.post("/api/register", tags=["Auth"])
def register_user(
    user_data: UserRegister, 
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Register a new client account. (Admin Only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create new accounts."
        )

    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters."
        )

    # Determine role: if email contains 'admin', make them admin (demo behaviour)
    role = "admin" if "admin" in user_data.email.lower() else "client"

    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(
        data={"sub": new_user.email, "role": new_user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=new_user.role,
        email=new_user.email
    )


@app.post("/api/login", response_model=Token, tags=["Auth"])
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and return a JWT token."""
    user = db.query(User).filter(User.email == user_credentials.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        email=user.email
    )


@app.get("/api/me", tags=["Auth"])
def read_users_me(current_user: TokenData = Depends(get_current_user)):
    """Return the currently authenticated user's info."""
    return {"email": current_user.email, "role": current_user.role}


# ── Projects (Tenants) ────────────────────────────────────────────────────────

@app.get("/api/projects", tags=["Projects"])
def get_projects(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Return projects visible to the logged-in user."""
    if current_user.role == "admin":
        tenants = db.query(Tenant).all()
        if tenants:
            return [{"id": t.id, "name": t.name, "system_prompt": t.system_prompt} for t in tenants]
        return [
            {"id": "proj_main_biz", "name": "Main Business Workspace", "system_prompt": ""},
            {"id": "proj_hireloop", "name": "HireLoop Ai", "system_prompt": ""},
        ]
    else:
        user = db.query(User).filter(User.email == current_user.email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        tenants = db.query(Tenant).filter(Tenant.user_id == user.id).all()
        if tenants:
            return [{"id": t.id, "name": t.name, "system_prompt": t.system_prompt} for t in tenants]
        return [{"id": f"proj_{user.email.split('@')[0]}", "name": user.email.split('@')[0].capitalize(), "system_prompt": ""}]


@app.post("/api/projects", tags=["Projects"])
def create_project(
    tenant_data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Create a new project/workspace."""
    existing = db.query(Tenant).filter(Tenant.id == tenant_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project ID already exists.")
        
    user = db.query(User).filter(User.email == current_user.email).first()
    new_tenant = Tenant(
        id=tenant_data.id,
        name=tenant_data.name,
        user_id=user.id
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return {"id": new_tenant.id, "name": new_tenant.name, "system_prompt": new_tenant.system_prompt}


@app.put("/api/projects/{tenant_id}", tags=["Projects"])
def update_project(
    tenant_id: str,
    update_data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Update a project's name or system prompt."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    if current_user.role != "admin":
        user = db.query(User).filter(User.email == current_user.email).first()
        if tenant.user_id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized to edit this project.")
            
    if update_data.name is not None:
        tenant.name = update_data.name
    if update_data.system_prompt is not None:
        tenant.system_prompt = update_data.system_prompt
        
    db.commit()
    db.refresh(tenant)
    return {"id": tenant.id, "name": tenant.name, "system_prompt": tenant.system_prompt}


@app.delete("/api/projects/{tenant_id}", tags=["Projects"])
def delete_project(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Delete a project and its query logs."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    if current_user.role != "admin":
        user = db.query(User).filter(User.email == current_user.email).first()
        if tenant.user_id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this project.")
            
    db.query(QueryLog).filter(QueryLog.widget_id == tenant_id).delete()
    db.delete(tenant)
    db.commit()
    return {"status": "success", "message": f"Project {tenant_id} deleted."}


# ── Analytics ─────────────────────────────────────────────────────────────────

@app.get("/analytics", tags=["Analytics"])
def analytics_endpoint(
    widget_id: Optional[str] = "default",
    db: Session = Depends(get_db)
):
    query = db.query(QueryLog)
    if widget_id and widget_id != "all":
        query = query.filter(QueryLog.widget_id == widget_id)

    logs = query.order_by(QueryLog.timestamp.desc()).all()

    total_queries = len(logs)
    unanswered_logs = [l for l in logs if l.is_unanswered]
    total_unanswered = len(unanswered_logs)
    total_answered = total_queries - total_unanswered
    resolution_rate = round((total_answered / total_queries * 100), 1) if total_queries > 0 else 100.0

    unanswered_counts: dict = {}
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
            }
            for log in logs[:50]
        ]
    }


@app.post("/analytics/clear", tags=["Analytics"])
def clear_analytics(
    widget_id: Optional[str] = "default",
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(QueryLog)
    if widget_id and widget_id != "all":
        query = query.filter(QueryLog.widget_id == widget_id)
    query.delete()
    db.commit()
    return {"status": "success", "message": f"Analytics cleared for '{widget_id}'."}


@app.get("/analytics/export", tags=["Analytics"])
def export_analytics_csv(
    widget_id: Optional[str] = "default",
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Exports query logs as CSV file."""
    query = db.query(QueryLog)
    if widget_id and widget_id != "all":
        query = query.filter(QueryLog.widget_id == widget_id)

    logs = query.order_by(QueryLog.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Widget ID", "Timestamp", "Question", "Answer", "Unanswered"])

    for log in logs:
        writer.writerow([
            log.id,
            log.widget_id,
            log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else "",
            log.question,
            log.answer,
            log.is_unanswered
        ])

    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=analytics_export_{widget_id}.csv"
    return response


# ── Leads (Capture & Management) ─────────────────────────────────────────────

@app.post("/api/leads", tags=["Leads"])
def capture_lead(lead_data: LeadCreate, db: Session = Depends(get_db)):
    """Public endpoint to capture visitor lead info from widget."""
    if not lead_data.name or not lead_data.email:
        raise HTTPException(status_code=400, detail="Name and email are required.")

    new_lead = Lead(
        widget_id=lead_data.widget_id or "default",
        name=lead_data.name.strip(),
        email=lead_data.email.strip(),
        phone=lead_data.phone.strip() if lead_data.phone else None,
        notes=lead_data.notes.strip() if lead_data.notes else None
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return {"status": "success", "message": "Lead captured successfully.", "lead_id": new_lead.id}


@app.get("/api/leads", tags=["Leads"])
def get_leads(
    widget_id: Optional[str] = "default",
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Returns captured leads for a widget ID."""
    query = db.query(Lead)
    if widget_id and widget_id != "all":
        query = query.filter(Lead.widget_id == widget_id)
    leads = query.order_by(Lead.timestamp.desc()).all()
    return [
        {
            "id": l.id,
            "widget_id": l.widget_id,
            "name": l.name,
            "email": l.email,
            "phone": l.phone,
            "notes": l.notes,
            "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else None
        }
        for l in leads
    ]


# ── Core / Health ─────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def read_root():
    return {"status": "ok", "message": "BrainDesk Backend is running!"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}


@app.get("/stats", tags=["Core"])
def stats_endpoint(
    widget_id: Optional[str] = "default",
    current_user: TokenData = Depends(get_current_user)
):
    return get_db_stats(widget_id=widget_id)


@app.post("/reset", tags=["Core"])
def reset_endpoint(
    widget_id: Optional[str] = "default",
    current_user: TokenData = Depends(get_current_user)
):
    res = reset_vectorstore(widget_id=widget_id)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Failed to reset vector database"))
    return res


# ── Chat (public — called by embedded widget) ─────────────────────────────────

@app.post("/chat", tags=["Chat"])
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """Public chat endpoint used by the embeddable widget. No auth required."""
    widget_id = request.widget_id or "default"
    
    tenant = db.query(Tenant).filter(Tenant.id == widget_id).first()
    system_prompt = tenant.system_prompt if tenant else None
    
    ai_result = ask_question(request.question, widget_id=widget_id, system_prompt=system_prompt)
    answer = ai_result.get("answer", "")
    sources = ai_result.get("sources", [])

    fallback_indicators = [
        "don't have that information",
        "dont have that information",
        "not contained within the context",
        "i don't know",
        "i do not have"
    ]
    is_unanswered = any(indicator in answer.lower() for indicator in fallback_indicators)

    try:
        db.add(QueryLog(
            widget_id=widget_id,
            question=request.question.strip(),
            answer=answer.strip(),
            is_unanswered=is_unanswered
        ))
        db.commit()
    except Exception as e:
        print(f"Analytics Logging Error: {e}")

    return {"answer": answer, "sources": sources, "widget_id": widget_id, "is_unanswered": is_unanswered}


# ── Knowledge Base (protected) ────────────────────────────────────────────────

@app.post("/scrape", tags=["Knowledge Base"])
def scrape_endpoint(
    request: ScrapeRequest,
    current_user: TokenData = Depends(get_current_user)
):
    if not request.url or not request.url.strip():
        raise HTTPException(status_code=400, detail="Website URL is required.")

    result = embed_url(url=request.url.strip(), widget_id=request.widget_id or "default")
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to scrape and embed URL"))

    return {
        "status": "success",
        "message": f"Successfully scraped '{result.get('title', result['source'])}' and added {result['chunks_added']} chunks.",
        "widget_id": request.widget_id,
        "source": result["source"]
    }


@app.post("/upload", tags=["Knowledge Base"])
async def upload_document(
    file: UploadFile = File(...),
    widget_id: Optional[str] = "default",
    current_user: TokenData = Depends(get_current_user)
):
    if not file.filename or not file.filename.endswith('.pdf'):
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
        return {
            "status": "success",
            "message": f"Successfully processed {file.filename} and added {result['chunks_added']} chunks (Tenant: {widget_id}).",
            "widget_id": widget_id
        }
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Unknown error occurred"))


@app.delete("/api/documents", tags=["Knowledge Base"])
def delete_document_endpoint(
    request: DocDeleteRequest,
    current_user: TokenData = Depends(get_current_user)
):
    """Deletes a specific document or URL source from ChromaDB for a workspace."""
    if not request.source or not request.source.strip():
        raise HTTPException(status_code=400, detail="Document source is required.")

    res = delete_document_source(source=request.source.strip(), widget_id=request.widget_id or "default")
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to delete document."))

    return res
