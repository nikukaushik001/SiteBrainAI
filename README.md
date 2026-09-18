<div align="center">

# 🧠 SiteBrain AI
### Autonomous Sales & Support Operations Platform

**A production-grade, multi-tenant B2B SaaS platform that deploys autonomous AI agents onto any website — empowering businesses to automate customer support, qualify leads, and self-improve their knowledge base.**

![Status](https://img.shields.io/badge/Status-Production_Ready-brightgreen.svg)
![Python](https://img.shields.io/badge/Python-3.11-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![LangChain](https://img.shields.io/badge/LangChain-Agentic-orange.svg)
![ChromaDB](https://img.shields.io/badge/ChromaDB-RAG-purple.svg)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)

</div>

---

## 🎯 Business Problem Solved

Customer-facing teams waste dozens of hours manually answering repetitive inquiries, qualifying inbound leads, and updating documentation. **SiteBrain AI eliminates this operational bottleneck** through autonomous AI agents that:

- 🔍 **Autonomously retrieve** the most relevant business context from a vector knowledge base
- 🔧 **Autonomously use tools** — capturing leads, booking appointments, or escalating to a human when frustrated
- 📊 **Self-improve** — detecting its own knowledge gaps and suggesting which documents to upload
- 🌐 **Deploy anywhere** via a single `<script>` tag

---

## 🤖 Agentic Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Customer Website                             │
│  <script src="/sitebrain-widget.js" data-widget-id="...">       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ User Message (SSE stream)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                       │
│                                                                   │
│  1. RETRIEVAL ──── ChromaDB vector search (filtered by tenant)   │
│         │          Top-5 relevant chunks retrieved                │
│         ▼                                                         │
│  2. TOOL DECISION ── LLM (Groq Llama3) decides:                  │
│         ├─ capture_lead    → User provided contact info          │
│         ├─ escalate_to_human → User is frustrated / needs human  │
│         └─ generate_response → Normal RAG answer                 │
│         ▼                                                         │
│  3. GENERATION ──── Streamed via SSE to widget                   │
│         │           Sentiment classified (Positive/Neutral/Neg)   │
│         ▼                                                         │
│  4. TRACE LOG ───── Event stored in Agent Trace store            │
│                     Visible in dashboard in real time             │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               React Dashboard (Vite + TypeScript)                │
│  • 🧠 Agent Trace Tab  — Live terminal of agent reasoning steps  │
│  • 📈 Analytics Tab    — Sentiment trends + Knowledge Gap Rpt   │
│  • 📬 Leads Tab        — AI-captured leads with CRM webhook     │
│  • ⚙️  Widget Studio   — Real-time brand/persona customization   │
│  • 📄 Knowledge Base   — Upload PDF/DOCX/CSV, scrape sitemaps   │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Agentic Features

| Feature | Description |
|---|---|
| **🧠 Agent Trace (Live)** | Real-time dashboard terminal showing every reasoning step: `RETRIEVAL → TOOL_CALL → GENERATION`. Watch the agent think. |
| **🔧 Multi-Tool Agent** | The AI autonomously selects between `capture_lead`, `escalate_to_human`, or generating a response based on context. |
| **🔍 RAG Knowledge Pipeline** | Ingests PDFs, DOCX, CSVs, and entire website sitemaps. Stores as vector embeddings in ChromaDB, filtered by tenant. |
| **⚠️ Knowledge Gap Detector** | AI analyzes unanswered queries and generates a structured report of missing knowledge topics with one-click fix links. |
| **📊 Sentiment Analysis** | Every query is automatically classified as Positive / Neutral / Negative. Trends visualized via Recharts. |
| **🏢 Multi-Tenant Architecture** | Isolated vector collections and database sessions per business client. One platform, unlimited deployments. |
| **🚀 Zero-Dependency Widget** | Embeds into any website (HTML, React, Next.js) with a single `<script>` tag. No npm install, no build step. |

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **AI Agent** | LangChain, Groq (Llama3-8B), Tool Calling |
| **Vector DB / RAG** | ChromaDB, HuggingFace `all-MiniLM-L6-v2` embeddings |
| **Relational DB** | SQLite + SQLAlchemy ORM |
| **Streaming** | Server-Sent Events (SSE) for real-time token streaming |
| **Frontend** | React 18, Vite, TypeScript, Recharts |
| **Widget** | Vanilla JavaScript + CSS (zero dependencies) |
| **Web Scraping** | BeautifulSoup4, `requests`, sitemap.xml parser |
| **Auth** | JWT (python-jose), bcrypt password hashing |
| **DevOps** | Docker + Docker Compose |

---

## 🚀 Quick Start (One Command)

### Prerequisites
- Docker & Docker Compose installed
- A free [Groq API key](https://console.groq.com/) (takes 30 seconds to create)

```bash
# 1. Clone the repo
git clone <repo-url>
cd SiteBrainAI

# 2. Create your .env file
cp .env.example .env
# Edit .env and set your GROQ_API_KEY

# 3. Launch everything
docker compose up --build

# 4. Seed demo users (run once after first startup)
curl -X POST http://localhost:8000/api/seed
```

| Service | URL |
|---|---|
| **Dashboard** | http://localhost |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@braindesk.ai` | `admin123` |
| **Client** | `client@hireloop.ai` | `client123` |

---

## 🔧 Local Development (Without Docker)

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🧠 How the Agent Works (Step-by-Step)

1. **User sends a message** via the embedded chat widget
2. **RETRIEVAL:** The agent queries ChromaDB for the top-5 most relevant document chunks, filtered to the correct tenant's knowledge base
3. **TOOL DECISION:** The LLM (Llama3 via Groq) analyzes the context and decides:
   - If the user provided contact info → calls `capture_lead` tool → saves to DB
   - If the user is frustrated or asks for human → calls `escalate_to_human` tool → flags session
   - Otherwise → generates a RAG-grounded response
4. **GENERATION:** Response streams back via SSE token by token for instant UX
5. **TRACE:** Every step is logged to the in-memory Agent Trace store, visible live in the dashboard
6. **ANALYTICS:** Query is logged with sentiment classification for trend analysis

---

## 📄 License

MIT License — see [LICENSE](LICENSE)
