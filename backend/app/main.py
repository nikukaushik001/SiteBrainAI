from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from app.ai_service import ask_question, embed_pdf, get_db_stats, reset_vectorstore
import os
import shutil

app = FastAPI(title="DocsAuraAI Backend")

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

@app.get("/")
def read_root():
    return {"status": "ok", "message": "DocsAuraAI Backend is running!"}

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
def chat_endpoint(request: ChatRequest):
    # Pass the question & widget_id tenant to our AI Service
    widget_id = request.widget_id or "default"
    answer = ask_question(request.question, widget_id=widget_id)
    return {"answer": answer, "widget_id": widget_id}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...), widget_id: Optional[str] = "default"):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    # Create a temporary directory if it doesn't exist
    temp_dir = os.path.join(BASE_DIR, "scripts", "temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    
    file_path = os.path.join(temp_dir, file.filename)
    
    # Save the uploaded file temporarily
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Process the PDF and embed it into ChromaDB for tenant widget_id
    result = embed_pdf(file_path, widget_id=widget_id or "default")
    
    # Clean up the temporary file
    if os.path.exists(file_path):
        os.remove(file_path)
        
    if result["success"]:
        return {"status": "success", "message": f"Successfully processed {file.filename} and added {result['chunks_added']} chunks to your DocsAuraAI brain (Tenant: {widget_id}).", "widget_id": widget_id}
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Unknown error occurred"))


