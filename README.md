# ✨ DocsAuraAI (Enterprise Multi-Tenant RAG SaaS)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-green)
![React](https://img.shields.io/badge/React-18.2-blue)
![Architecture](https://img.shields.io/badge/Multi--Tenant-Isolated-purple)

DocsAuraAI is an enterprise-grade RAG (Retrieval-Augmented Generation) Chatbot SaaS platform. It allows business owners and SaaS clients to upload PDF documents (like menus, FAQs, policies, or handbooks) and generate custom, brandable AI chat widgets that embed directly onto client websites with complete tenant data isolation.

The AI strictly answers customer questions based *only* on the documents uploaded for that specific business (`widget_id`), completely preventing hallucinations and cross-tenant data leakage.

---

## 🌟 Key Features & Highlights

- **✨ Futuristic Glassmorphic Dashboard**: Cyber-glowing UI built with React + Vite, custom scrollbars, and dynamic live preview.
- **🔐 Multi-Tenant Data Isolation**: ChromaDB vector store filters embeddings strictly by `widget_id`.
- **💬 Live AI Chat Playground**: Test business AI responses directly inside the dashboard.
- **📄 Knowledge Base Management**: Active document tracking with `source` file metadata and 1-click tenant reset.
- **🎨 Widget Customization Studio**: Customize Bot Title, Primary Brand Color, Welcome Greeting, and Screen Position.

---

## 🚀 Tech Stack
- **Backend:** Python, FastAPI
- **AI & RAG:** LangChain, Groq (`llama-3.3-70b`), HuggingFace Embeddings (`all-MiniLM-L6-v2`)
- **Vector Database:** ChromaDB (Local, 100% Open-Source Vector Storage with Metadata Filtering)
- **Frontend Dashboard:** React, Vite TypeScript, Vanilla CSS (Glassmorphism design system)
- **Embeddable Widget:** Vanilla JavaScript & CSS overlay script

---

## 🛠️ Getting Started (Local Development)

### 1. Backend Setup
Navigate to the backend directory and install requirements:
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
Part of an advanced AI SaaS portfolio build. Contributions and feature requests are welcome! (MIT License)
