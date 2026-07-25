<div align="center">
  <img src="./logo.svg" width="100" alt="BrainDesk Logo" />
  <h1 align="center">BrainDesk AI</h1>
  <p align="center"><strong>Enterprise Multi-Tenant RAG SaaS Platform</strong></p>

  <p align="center">
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  </p>
  
  <p align="center">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License" />
    <img src="https://img.shields.io/badge/Status-Active-success.svg?style=flat-square" alt="Status" />
  </p>
</div>

---

## 🌟 Overview

**BrainDesk** is an enterprise-grade RAG (Retrieval-Augmented Generation) Chatbot SaaS platform. It enables business owners to instantly deploy intelligent, 24/7 AI support agents to their websites without any coding.

Simply crawl your website URLs or upload PDF documents (menus, FAQs, internal handbooks), and BrainDesk will generate a brandable, embeddable AI chat widget. 

### 🔐 Zero-Leakage Architecture
The platform features **complete multi-tenant data isolation**. The AI strictly answers customer questions based *only* on the documents uploaded for that specific business (`widget_id`), entirely preventing cross-tenant data leakage and hallucinations.

---

## ✨ Key Features

- **Futuristic UI Dashboard**: Cyber-glowing glassmorphic design built with React, Vite, and custom CSS.
- **Tenant Access Control**: "God Mode" platform admin dashboard vs. isolated client workspaces.
- **Smart Web Crawler**: Instantly scrape and index any website (including Next.js/React SPAs).
- **PDF Knowledge Base**: Upload employee handbooks, pricing guides, or FAQs.
- **Unanswered Intelligence Analytics**: Automatically track and group questions the AI couldn't answer.
- **Live AI Playground**: Test your business's AI responses safely inside the dashboard sandbox.
- **Widget Customization Studio**: Brand your bot's color, title, and welcome greeting instantly.

---

## 🛠️ Architecture & Tech Stack

### Frontend Application
- **Framework:** React + Vite (TypeScript)
- **Styling:** Vanilla CSS (Tailored Design System, Glassmorphism, CSS Modules)
- **Routing:** React Router v6

### Backend API
- **Framework:** Python, FastAPI
- **AI Orchestration:** LangChain
- **LLM Engine:** Groq API (`llama-3.3-70b-versatile`)
- **Embeddings:** HuggingFace (`all-MiniLM-L6-v2`)
- **Vector Database:** ChromaDB (Local, Open-Source Vector Storage with Metadata Filtering)

### Embeddable Widget
- **Core:** Vanilla JavaScript & CSS overlay script (Zero dependencies)

---

## 🚀 Getting Started (Local Development)

### 1. Backend Setup
Navigate to the backend directory and install the requirements:
```bash
cd backend
pip install -r requirements.txt
```

Ensure your `.env` file inside `backend/` contains your Groq API key:
```env
GROQ_API_KEY="your_groq_api_key_here"
```

Start the FastAPI backend server:
```bash
cd backend
python -m uvicorn app.main:app --reload
```
- **Swagger UI Docs:** http://127.0.0.1:8000/docs
- **Health Check:** http://127.0.0.1:8000/health

### 2. Frontend Dashboard Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🤝 Contributing & License
Part of an advanced AI SaaS portfolio build. Contributions and feature requests are welcome! 

Distributed under the MIT License.
