from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from app.ai_service import ask_question

app = FastAPI(title="SiteBrainAI Backend")

# Enable CORS for the frontend and widget
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the dashboard and client domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    question: str
    history: Optional[List[ChatMessage]] = []

@app.get("/")
def read_root():
    return {"status": "ok", "message": "SiteBrainAI Backend is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    # Pass the question to our AI Service
    # (In the future, we will also pass the history for follow-up questions)
    answer = ask_question(request.question)
    return {"answer": answer}
