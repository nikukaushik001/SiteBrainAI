from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Response, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
import csv
import io

import requests
from sqlalchemy.orm import Session
from app.database import get_db, engine, Base
from app.models import User, Tenant, QueryLog, Lead, ChatSession, ChatMessage, AgentBooking, AccessRequest
from app.auth import (
    UserLogin, verify_password, get_password_hash,
    create_access_token, get_current_user,
    Token, TokenData, timedelta, ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.ai_service import ask_question, ask_question_stream, embed_document, embed_url, crawl_sitemap, get_db_stats, reset_vectorstore, delete_document_source


from sqlalchemy import text

# Create database tables on startup
Base.metadata.create_all(bind=engine)

def run_migrations():
    with engine.begin() as conn:
        # Add new columns if they don't exist
        for col in ["phone_number", "support_email", "operating_hours", "ai_persona"]:
            try:
                conn.execute(text(f"ALTER TABLE tenants ADD COLUMN {col} VARCHAR;"))
            except Exception:
                pass # Column already exists

run_migrations()

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

class ChatMessageInput(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    question: str
    widget_id: Optional[str] = "default"
    session_id: Optional[str] = None
    history: Optional[List[ChatMessageInput]] = []

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
    starter_prompts: Optional[str] = None
    webhook_url: Optional[str] = None
    allowed_domains: Optional[str] = None
    phone_number: Optional[str] = None
    support_email: Optional[str] = None
    operating_hours: Optional[str] = None
    ai_persona: Optional[str] = None

class LeadCreate(BaseModel):
    widget_id: Optional[str] = "default"
    name: str
    email: str
    phone: Optional[str] = None
    notes: Optional[str] = None

class DocDeleteRequest(BaseModel):
    source: str
    widget_id: Optional[str] = "default"

class AccessRequestCreate(BaseModel):
    name: str
    email: str


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
    user = db.query(User).filter(User.email == current_user.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if current_user.role == "admin":
        tenants = db.query(Tenant).all()
    else:
        tenants = db.query(Tenant).filter(Tenant.user_id == user.id).all()
        
    return [{
        "id": t.id, "name": t.name, "system_prompt": t.system_prompt, 
        "starter_prompts": t.starter_prompts, "webhook_url": t.webhook_url, 
        "allowed_domains": t.allowed_domains, "phone_number": t.phone_number,
        "support_email": t.support_email, "operating_hours": t.operating_hours,
        "ai_persona": t.ai_persona
    } for t in tenants]


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
    return {
        "id": new_tenant.id, "name": new_tenant.name, "system_prompt": new_tenant.system_prompt, 
        "starter_prompts": new_tenant.starter_prompts, "webhook_url": new_tenant.webhook_url, 
        "allowed_domains": new_tenant.allowed_domains, "phone_number": new_tenant.phone_number,
        "support_email": new_tenant.support_email, "operating_hours": new_tenant.operating_hours,
        "ai_persona": new_tenant.ai_persona
    }


@app.get("/api/users", tags=["Users"])
def get_users(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Admin only: List all users/clients."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    users = db.query(User).all()
    return [{"id": u.id, "email": u.email, "role": u.role} for u in users]


@app.post("/api/request-access", tags=["Users"])
def create_access_request(req: AccessRequestCreate, db: Session = Depends(get_db)):
    """Public endpoint to submit an access request."""
    new_req = AccessRequest(name=req.name, email=req.email)
    db.add(new_req)
    db.commit()
    return {"message": "Request received"}

@app.get("/api/request-access", tags=["Users"])
def get_access_requests(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Admin only: list all pending access requests."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    requests = db.query(AccessRequest).order_by(AccessRequest.timestamp.desc()).all()
    return [{"id": r.id, "name": r.name, "email": r.email, "timestamp": r.timestamp} for r in requests]

@app.delete("/api/request-access/{req_id}", tags=["Users"])
def delete_access_request(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Admin only: dismiss an access request."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    req = db.query(AccessRequest).filter(AccessRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    db.delete(req)
    db.commit()
    return {"message": "Deleted successfully"}


@app.get("/api/leads", tags=["Leads"])
def get_leads(
    widget_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Admin or Tenant Owner: get captured leads."""
    user = db.query(User).filter(User.email == current_user.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    query = db.query(Lead)
    if current_user.role != "admin":
        # Ensure they own the widget_id
        owned_tenants = db.query(Tenant).filter(Tenant.user_id == user.id).all()
        owned_ids = [t.id for t in owned_tenants]
        query = query.filter(Lead.widget_id.in_(owned_ids))
        
    if widget_id:
        query = query.filter(Lead.widget_id == widget_id)
        
    leads = query.order_by(Lead.timestamp.desc()).all()
    return [{"id": l.id, "widget_id": l.widget_id, "name": l.name, "email": l.email, "phone": l.phone, "notes": l.notes, "timestamp": l.timestamp} for l in leads]

@app.delete("/api/leads/{lead_id}", tags=["Leads"])
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Delete a captured lead."""
    user = db.query(User).filter(User.email == current_user.email).first()
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    if current_user.role != "admin":
        tenant = db.query(Tenant).filter(Tenant.id == lead.widget_id).first()
        if not tenant or tenant.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
            
    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted"}
def assign_project(
    project_id: str,
    user_email: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Admin only: Assign a project to a client email."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    target_user = db.query(User).filter(User.email == user_email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    tenant = db.query(Tenant).filter(Tenant.id == project_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Project not found")

    tenant.user_id = target_user.id
    db.commit()
    return {"status": "success", "message": f"Assigned project {project_id} to {user_email}"}


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
    if update_data.starter_prompts is not None:
        tenant.starter_prompts = update_data.starter_prompts
    if update_data.webhook_url is not None:
        tenant.webhook_url = update_data.webhook_url
    if update_data.allowed_domains is not None:
        tenant.allowed_domains = update_data.allowed_domains
    if update_data.phone_number is not None:
        tenant.phone_number = update_data.phone_number
    if update_data.support_email is not None:
        tenant.support_email = update_data.support_email
    if update_data.operating_hours is not None:
        tenant.operating_hours = update_data.operating_hours
    if update_data.ai_persona is not None:
        tenant.ai_persona = update_data.ai_persona
        
    db.commit()
    db.refresh(tenant)
    return {
        "id": tenant.id, "name": tenant.name, "system_prompt": tenant.system_prompt, 
        "starter_prompts": tenant.starter_prompts, "webhook_url": tenant.webhook_url, 
        "allowed_domains": tenant.allowed_domains, "phone_number": tenant.phone_number,
        "support_email": tenant.support_email, "operating_hours": tenant.operating_hours,
        "ai_persona": tenant.ai_persona
    }


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

    sentiment_counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
    volume_dict = {}
    for l in logs:
        s = getattr(l, "sentiment", "Neutral") or "Neutral"
        sentiment_counts[s] = sentiment_counts.get(s, 0) + 1
        
        if l.timestamp:
            date_str = l.timestamp.strftime("%Y-%m-%d")
            if date_str not in volume_dict:
                volume_dict[date_str] = {"date": date_str, "queries": 0, "unanswered": 0}
            volume_dict[date_str]["queries"] += 1
            if l.is_unanswered:
                volume_dict[date_str]["unanswered"] += 1

    volume_by_day = sorted(list(volume_dict.values()), key=lambda x: x["date"])[-7:]

    return {
        "widget_id": widget_id,
        "total_queries": total_queries,
        "total_answered": total_answered,
        "total_unanswered": total_unanswered,
        "resolution_rate_pct": resolution_rate,
        "top_unanswered": top_unanswered,
        "sentiment_breakdown": sentiment_counts,
        "volume_by_day": volume_by_day,
        "recent_logs": [
            {
                "id": log.id,
                "question": log.question,
                "answer": log.answer,
                "is_unanswered": log.is_unanswered,
                "sentiment": getattr(log, "sentiment", "Neutral") or "Neutral",
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else None
            }
            for log in logs[:50]
        ]
    }


@app.post("/analytics/generate-faq", tags=["Analytics"])
def generate_faq(
    widget_id: Optional[str] = "default",
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    from app.ai_service import llm
    from langchain.schema import SystemMessage, HumanMessage
    
    logs = db.query(QueryLog).filter(QueryLog.widget_id == widget_id, QueryLog.is_unanswered == False).order_by(QueryLog.timestamp.desc()).limit(100).all()
    if not logs:
        raise HTTPException(status_code=400, detail="No answered queries available to generate FAQ.")
        
    qa_text = "\n".join([f"Q: {log.question}\nA: {log.answer}" for log in logs])
    
    msg = [
        SystemMessage(content="You are an expert documentation writer. Given a list of customer Q&As, group them logically and generate a clean, structured FAQ document in Markdown. Do not include introductory text, just the Markdown."),
        HumanMessage(content=f"Generate FAQ for these Q&As:\n\n{qa_text}")
    ]
    
    res = llm.invoke(msg)
    faq_content = res.content if hasattr(res, 'content') else str(res)
    return {"status": "success", "faq": faq_content}

@app.get("/api/analytics", tags=["Analytics"])
def get_analytics(
    widget_id: Optional[str] = "default",
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Return dashboard analytics. Enforces client ownership."""
    user = db.query(User).filter(User.email == current_user.email).first()
    
    # Enforce RBAC
    if current_user.role == "client" and widget_id != "all":
        tenant = db.query(Tenant).filter(Tenant.id == widget_id).first()
        if not tenant or tenant.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this project.")
    elif current_user.role == "client" and widget_id == "all":
        # If client requests 'all', force it to their first project
        tenant = db.query(Tenant).filter(Tenant.user_id == user.id).first()
        if tenant:
            widget_id = tenant.id
        else:
            return {"total_queries": 0, "total_answered": 0, "total_unanswered": 0, "resolution_rate_pct": 0, "top_unanswered": [], "recent_logs": []}

    return analytics_endpoint(widget_id, db)


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

def send_webhook(url: str, payload: dict):
    try:
        requests.post(url, json=payload, timeout=5)
    except Exception as e:
        print(f"Webhook error: {e}")

@app.post("/api/leads", tags=["Leads"])
def capture_lead(lead_data: LeadCreate, req: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Public endpoint to capture leads from the widget. No auth required."""
    widget_id = lead_data.widget_id or "default"
    
    tenant = db.query(Tenant).filter(Tenant.id == widget_id).first()
    if tenant and tenant.allowed_domains:
        origin = req.headers.get("origin") or req.headers.get("referer") or ""
        allowed = [d.strip().lower() for d in tenant.allowed_domains.split(",") if d.strip()]
        if origin and not any(a in origin.lower() for a in allowed) and "localhost" not in origin.lower() and "127.0.0.1" not in origin.lower():
            raise HTTPException(status_code=403, detail="Unauthorized domain")

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

    tenant = db.query(Tenant).filter(Tenant.id == lead_data.widget_id).first()
    if tenant and tenant.webhook_url:
        payload = {
            "name": new_lead.name,
            "email": new_lead.email,
            "phone": new_lead.phone,
            "notes": new_lead.notes,
            "widget_id": new_lead.widget_id
        }
        background_tasks.add_task(send_webhook, tenant.webhook_url, payload)

    return {"status": "success", "message": "Lead captured successfully.", "lead_id": new_lead.id}


@app.get("/api/leads", tags=["Leads"])
def get_leads(
    widget_id: Optional[str] = "default",
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Fetch captured leads for a specific widget."""
    user = db.query(User).filter(User.email == current_user.email).first()

    if current_user.role == "client":
        if widget_id == "all":
            tenant = db.query(Tenant).filter(Tenant.user_id == user.id).first()
            widget_id = tenant.id if tenant else "none"
        else:
            tenant = db.query(Tenant).filter(Tenant.id == widget_id).first()
            if not tenant or tenant.user_id != user.id:
                raise HTTPException(status_code=403, detail="Forbidden: You do not own this project.")

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

@app.get("/api/bookings", tags=["Leads"])
def get_bookings(
    widget_id: Optional[str] = "default",
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Returns captured bookings for a widget ID."""
    query = db.query(AgentBooking)
    if widget_id and widget_id != "all":
        query = query.filter(AgentBooking.widget_id == widget_id)
    bookings = query.order_by(AgentBooking.timestamp.desc()).all()
    return [
        {
            "id": b.id,
            "widget_id": b.widget_id,
            "customer_name": b.customer_name,
            "customer_email": b.customer_email,
            "booking_time": b.booking_time,
            "notes": b.notes,
            "timestamp": b.timestamp.strftime("%Y-%m-%d %H:%M:%S") if b.timestamp else None
        }
        for b in bookings
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
def chat_endpoint(request: ChatRequest, req: Request, db: Session = Depends(get_db)):
    """Public chat endpoint used by the embeddable widget. No auth required."""
    widget_id = request.widget_id or "default"
    
    tenant = db.query(Tenant).filter(Tenant.id == widget_id).first()
    
    # Enforce Domain Whitelisting
    if tenant and tenant.allowed_domains:
        origin = req.headers.get("origin") or req.headers.get("referer") or ""
        allowed = [d.strip().lower() for d in tenant.allowed_domains.split(",") if d.strip()]
        # Always allow localhost for dashboard preview
        if origin and not any(a in origin.lower() for a in allowed) and "localhost" not in origin.lower() and "127.0.0.1" not in origin.lower():
            raise HTTPException(status_code=403, detail="Unauthorized domain")
            
    if tenant:
        base_prompt = tenant.system_prompt or "You are a helpful and polite customer support assistant."
        persona = tenant.ai_persona or "Professional"
        business_details = f"Business Name: {tenant.name}\n"
        if tenant.phone_number: business_details += f"Phone: {tenant.phone_number}\n"
        if tenant.support_email: business_details += f"Email: {tenant.support_email}\n"
        if tenant.operating_hours: business_details += f"Hours: {tenant.operating_hours}\n"
        
        system_prompt = f"{base_prompt}\n\n[BUSINESS DETAILS]\n{business_details}\n[PERSONALITY/TONE]\nYou must adopt the following persona/tone: {persona}. Ensure all your responses strictly match this tone.\n\n[LEAD CAPTURE]\nIf the user wants to book an appointment, schedule a service, or get a quote, you MUST ask for their Name, Email, and Phone. Once they provide it, you MUST use the `capture_lead` tool to save their details."
    else:
        system_prompt = None
    
    if request.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
        if not session:
            session = ChatSession(id=request.session_id, widget_id=widget_id)
            db.add(session)
            db.commit()
        db.add(ChatMessage(session_id=request.session_id, role="user", content=request.question.strip()))
        db.commit()

    ai_result = ask_question(request.question, widget_id=widget_id, system_prompt=system_prompt)
    answer = ai_result.get("answer", "")
    sources = ai_result.get("sources", [])
    
    if request.session_id:
        db.add(ChatMessage(session_id=request.session_id, role="assistant", content=answer.strip()))
        db.commit()

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
            is_unanswered=is_unanswered,
            sentiment=ai_result.get("sentiment", "Neutral")
        ))
        db.commit()
    except Exception as e:
        print(f"Analytics Logging Error: {e}")

    return {"answer": answer, "sources": sources, "widget_id": widget_id, "is_unanswered": is_unanswered, "sentiment": ai_result.get("sentiment", "Neutral")}

@app.get("/chat/history/{session_id}", tags=["Chat"])
def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.timestamp.asc()).all()
    return [{"role": m.role, "content": m.content, "timestamp": m.timestamp.strftime("%Y-%m-%d %H:%M:%S") if m.timestamp else None} for m in messages]


# ── Streaming Chat (SSE) ──────────────────────────────────────────────────────

from fastapi.responses import StreamingResponse
import json as json_module

@app.post("/chat/stream", tags=["Chat"])
def chat_stream_endpoint(request: ChatRequest, req: Request, db: Session = Depends(get_db)):
    """SSE streaming chat endpoint — sends tokens in real-time for the dashboard playground."""
    widget_id = request.widget_id or "default"

    tenant = db.query(Tenant).filter(Tenant.id == widget_id).first()

    # Enforce Domain Whitelisting
    if tenant and tenant.allowed_domains:
        origin = req.headers.get("origin") or req.headers.get("referer") or ""
        allowed = [d.strip().lower() for d in tenant.allowed_domains.split(",") if d.strip()]
        if origin and not any(a in origin.lower() for a in allowed) and "localhost" not in origin.lower() and "127.0.0.1" not in origin.lower():
            raise HTTPException(status_code=403, detail="Unauthorized domain")

    if tenant:
        base_prompt = tenant.system_prompt or "You are a helpful and polite customer support assistant."
        persona = tenant.ai_persona or "Professional"
        business_details = f"Business Name: {tenant.name}\n"
        if tenant.phone_number: business_details += f"Phone: {tenant.phone_number}\n"
        if tenant.support_email: business_details += f"Email: {tenant.support_email}\n"
        if tenant.operating_hours: business_details += f"Hours: {tenant.operating_hours}\n"
        
        system_prompt = f"{base_prompt}\n\n[BUSINESS DETAILS]\n{business_details}\n[PERSONALITY/TONE]\nYou must adopt the following persona/tone: {persona}. Ensure all your responses strictly match this tone.\n\n[LEAD CAPTURE]\nIf the user wants to book an appointment, schedule a service, or get a quote, you MUST ask for their Name, Email, and Phone. Once they provide it, you MUST use the `capture_lead` tool to save their details."
    else:
        system_prompt = None

    def event_generator():
        full_answer = ""
        sources = []
        for event in ask_question_stream(request.question, widget_id=widget_id, system_prompt=system_prompt):
            if event.get("done"):
                sources = event.get("sources", [])
                full_answer = event.get("full_answer", full_answer)
                yield f"data: {json_module.dumps({'done': True, 'sources': sources})}\n\n"
            elif event.get("token"):
                full_answer += event["token"]
                yield f"data: {json_module.dumps({'token': event['token']})}\n\n"

        # Log to analytics after streaming completes
        fallback_indicators = [
            "don't have that information",
            "dont have that information",
            "not contained within the context",
            "i don't know",
            "i do not have"
        ]
        is_unanswered = any(indicator in full_answer.lower() for indicator in fallback_indicators)

        try:
            db_session = next(get_db())
            db_session.add(QueryLog(
                widget_id=widget_id,
                question=request.question.strip(),
                answer=full_answer.strip(),
                is_unanswered=is_unanswered,
                sentiment="Neutral"
            ))
            db_session.commit()
            db_session.close()
        except Exception as e:
            print(f"Stream Analytics Logging Error: {e}")

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ── Conversation History (protected) ──────────────────────────────────────────

@app.get("/api/conversations", tags=["Chat"])
def get_conversations(
    widget_id: Optional[str] = "default",
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Returns all chat sessions for a widget_id with message count and preview."""
    user = db.query(User).filter(User.email == current_user.email).first()

    if current_user.role == "client":
        if widget_id == "all":
            tenant = db.query(Tenant).filter(Tenant.user_id == user.id).first()
            widget_id = tenant.id if tenant else "none"
        else:
            tenant = db.query(Tenant).filter(Tenant.id == widget_id).first()
            if not tenant or tenant.user_id != user.id:
                raise HTTPException(status_code=403, detail="Forbidden: You do not own this project.")

    query = db.query(ChatSession)
    if widget_id and widget_id != "all":
        query = query.filter(ChatSession.widget_id == widget_id)

    sessions = query.order_by(ChatSession.timestamp.desc()).all()

    result = []
    for session in sessions:
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session.id
        ).order_by(ChatMessage.timestamp.asc()).all()

        # Get the first user message as preview
        preview = ""
        for msg in messages:
            if msg.role == "user":
                preview = msg.content[:80] + ("..." if len(msg.content) > 80 else "")
                break

        result.append({
            "id": session.id,
            "widget_id": session.widget_id,
            "timestamp": session.timestamp.strftime("%Y-%m-%d %H:%M:%S") if session.timestamp else None,
            "message_count": len(messages),
            "preview": preview
        })

    return result



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

@app.post("/scrape/sitemap", tags=["Knowledge Base"])
def scrape_sitemap_endpoint(
    request: ScrapeRequest,
    current_user: TokenData = Depends(get_current_user)
):
    if not request.url or not request.url.strip():
        raise HTTPException(status_code=400, detail="Sitemap URL is required.")

    result = crawl_sitemap(sitemap_url=request.url.strip(), widget_id=request.widget_id or "default")
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to crawl sitemap"))

    return {
        "status": "success",
        "message": result.get("message"),
        "widget_id": request.widget_id
    }


@app.post("/upload", tags=["Knowledge Base"])
async def upload_document(
    file: UploadFile = File(...),
    widget_id: Optional[str] = "default",
    current_user: TokenData = Depends(get_current_user)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required.")
        
    ext = file.filename.split('.')[-1].lower()
    if ext not in ['pdf', 'docx', 'txt', 'csv']:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, TXT, and CSV files are supported.")

    temp_dir = os.path.join(BASE_DIR, "scripts", "temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = embed_document(file_path, widget_id=widget_id or "default")

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
