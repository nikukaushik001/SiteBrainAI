# 🧠 SiteBrain AI

![SiteBrain AI](https://img.shields.io/badge/Status-Active-brightgreen.svg)
![Python](https://img.shields.io/badge/Python-3.11-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal.svg)
![React](https://img.shields.io/badge/React-18.0-61dafb.svg)

SiteBrain AI is a B2B SaaS platform providing customizable, RAG-powered AI customer support widgets for modern web applications. 

## Features
- **Embeddable Chat Widget**: Integrate into any website with a single `<script>` tag.
- **RAG Knowledge Base**: Powered by ChromaDB and OpenAI.
- **Automated Web Scraping**: Vectorize entire websites via sitemaps.
- **Multi-Tenant Architecture**: Supports multiple isolated clients.
- **Analytics Dashboard**: Visualizes chat volume and sentiment.

## Getting Started

### Backend
\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
