# 🧠 SiteBrainAI (Docs-to-Agent SaaS)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-green)
![React](https://img.shields.io/badge/React-18.2-blue)

SiteBrainAI is a RAG (Retrieval-Augmented Generation) Chatbot SaaS. It allows business owners to upload their PDFs (like menus, FAQs, or employee handbooks) and generate a custom AI chat widget that they can embed directly onto their own websites.

The AI strictly answers customer questions based *only* on the documents the business owner uploaded, preventing hallucinations.

## 🚀 Tech Stack
- **Backend:** Python, FastAPI
- **AI & RAG:** LangChain, Groq (Llama 3.3), HuggingFace Embeddings
- **Vector Database:** ChromaDB (Local, 100% Free & Open-Source)
- **Frontend Dashboard:** React, Vite, Vanilla CSS
- **Embeddable Widget:** Vanilla JavaScript

## 📁 Project Structure
```text
SiteBrainAI/
├── backend/            # FastAPI Backend & RAG Logic
│   ├── app/            # API Endpoints & AI Services
│   └── scripts/        # Standalone scripts (PDF extraction, CLI chat tester)
├── frontend/           # React Dashboard for Business Owners
└── widget/             # The embeddable script for client websites
```

## 🛠️ Getting Started (Local Development)

### 1. Backend Setup
Navigate to the backend directory and install the requirements:
```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside the `backend/` folder and add your free Groq API key:
```env
GROQ_API_KEY="your_groq_api_key_here"
```

### 2. Generate Vector Embeddings
Before running the API, you need to populate the database with a PDF document.
```bash
cd backend/scripts
# Generates a dummy 'sample.pdf' for testing
python generate_pdf.py 

# Extracts text from sample.pdf and saves it to ChromaDB
python process_pdf.py  
```

### 3. Run the Server & Test
Start the FastAPI server:
```bash
cd backend
python -m uvicorn app.main:app --reload
```
- **Swagger UI:** http://127.0.0.1:8000/docs
- **CLI Tester:** You can also run `python scripts/test_chat.py` in a new terminal to chat with the AI directly from your command line!

## 🤝 Contributing
This project is part of a learning bootcamp and portfolio build. Contributions, issues, and feature requests are welcome!
