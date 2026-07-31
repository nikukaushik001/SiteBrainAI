from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="client") # "admin" or "client"

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(String, primary_key=True, index=True) # e.g. proj_hireloop
    name = Column(String, nullable=False)
    system_prompt = Column(String, nullable=True) # Custom instructions for the LLM
    starter_prompts = Column(String, nullable=True) # Comma-separated starter chips
    webhook_url = Column(String, nullable=True) # CRM Webhook URL
    allowed_domains = Column(String, nullable=True) # Comma-separated list of allowed origins
    user_id = Column(Integer, ForeignKey("users.id")) # Optional ownership

class QueryLog(Base):
    __tablename__ = "query_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    widget_id = Column(String, index=True, nullable=False)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    is_unanswered = Column(Boolean, default=False)
    sentiment = Column(String, default="Neutral") # Positive, Neutral, Negative
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    widget_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(String, primary_key=True, index=True) # UUID
    widget_id = Column(String, index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), index=True)
    role = Column(String, nullable=False) # "user" or "assistant"
    content = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class AgentBooking(Base):
    __tablename__ = "agent_bookings"
    id = Column(Integer, primary_key=True, index=True)
    widget_id = Column(String, index=True, nullable=False)
    customer_name = Column(String, nullable=False)
    customer_email = Column(String, nullable=False)
    booking_time = Column(String, nullable=False) # "YYYY-MM-DD HH:MM"
    notes = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

