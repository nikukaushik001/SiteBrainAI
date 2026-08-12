<div align="center">
  <img src="https://raw.githubusercontent.com/nikukaushik001/SiteBrainAI/main/frontend/public/vite.svg" alt="SiteBrain AI Logo" width="120" />
  <h1>🧠 SiteBrain AI</h1>
  <p><strong>A B2B SaaS platform providing customizable, RAG-powered AI customer support widgets for modern web applications.</strong></p>

  ![SiteBrain AI](https://img.shields.io/badge/Status-Active-brightgreen.svg)
  ![Python](https://img.shields.io/badge/Python-3.11-blue.svg)
  ![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal.svg)
  ![React](https://img.shields.io/badge/React-18.0-61dafb.svg)
</div>

<br />

SiteBrain AI empowers businesses to create, train, and deploy intelligent AI chatbots directly onto their websites in minutes. By leveraging Retrieval-Augmented Generation (RAG) and vector embeddings, the AI acts as a domain expert, answering customer inquiries instantly based exclusively on the company's uploaded documents and scraped website content.

## 🎯 Key Features

- **Embeddable Chat Widget**: A dynamic, highly customizable JavaScript widget that integrates into any website (HTML, React, Next.js) with a single script tag.
- **RAG Knowledge Base**: Uses ChromaDB vector search to retrieve relevant business context, preventing AI hallucinations and ensuring accurate support answers.
- **Automated Web Scraping**: Ingests and vectorizes entire websites via sitemaps, automatically building a knowledge base from existing documentation.
- **Multi-Tenant Architecture**: Supports multiple business projects/clients from a single backend, isolating data and vector collections per tenant.
- **Analytics & Lead Generation**: Captures pre-chat lead information and visualizes chat volume and visitor sentiment using interactive Recharts.
- **Widget Studio Customization**: Real-time configuration of the widget's appearance, fonts, custom avatars, proactive popup messages, and system prompts.

## 🛠️ Technical Stack

### Backend (API & AI Processing)
- **FastAPI (Python)**: High-performance, asynchronous REST API.
- **LangChain & OpenAI**: Orchestrates language model calls and text processing.
- **ChromaDB**: Local vector database for storing and querying document embeddings.
- **SQLAlchemy (SQLite)**: Relational database for managing tenants, chat sessions, and captured leads.
- **BeautifulSoup**: Parses and scrapes HTML content from client sitemaps.

### Frontend (Dashboard & Widget)
- **React 18 & Vite**: Lightning-fast frontend tooling and rendering.
- **TypeScript**: Ensures type safety across complex dashboard states.
- **Recharts**: Renders beautiful, responsive analytics dashboards.
- **Vanilla JS & CSS (Widget)**: The embeddable widget is built with raw JavaScript to ensure zero dependency conflicts and sub-millisecond load times on client websites.

## 🚀 Getting Started

### 1. Start the Backend

Navigate to the backend directory, install the Python dependencies, and start the FastAPI server:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Start the Frontend

In a new terminal window, navigate to the frontend directory, install the Node dependencies, and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to view the Dashboard!

## 📄 License

This project is licensed under the MIT License.
