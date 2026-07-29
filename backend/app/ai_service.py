import os
import re
import fitz
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter

from langchain_core.tools import tool
from pydantic import BaseModel, Field
import json
from app.database import SessionLocal
from app.models import AgentBooking


import csv
import docx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET
import requests


# Load env variables
load_dotenv()

# We need the Chroma DB path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_DB_DIR = os.path.join(BASE_DIR, "scripts", "chroma_db")

# Initialize the Embeddings Model
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Initialize the Vector Store
vectorstore = Chroma(
    persist_directory=CHROMA_DB_DIR,
    embedding_function=embeddings_model
)

# Initialize the Retriever (fetches top 3 chunks)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# Initialize the LLM (Groq Llama 3.3)
llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    temperature=0.0
)

def clean_context(text: str) -> str:
    """Strip HTML tags and escape characters that break LangChain template parsing."""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove badge markdown image links like [![text](url)](url)
    text = re.sub(r'!?\[([^\]]*)\]\([^)]*\)', r'\1', text)
    # Remove any remaining curly braces that could break template parsing
    text = text.replace('{', '(').replace('}', ')')
    return text.strip()

def format_docs(docs):
    return "\n\n".join(clean_context(doc.page_content) for doc in docs)

def build_messages(question: str, context: str, system_prompt: str = None) -> list:
    """Build LLM messages directly — bypasses ChatPromptTemplate to avoid curly-brace f-string issues."""
    base = system_prompt if system_prompt else "You are a helpful and polite customer support assistant for a business."
    system_content = f"""{base}

Your goal is to answer the user's question based strictly on the provided context.

Context:
{context}

Instructions:
- If the answer is not in the context, say: "I don't have that information. Please contact support."
- Do not make up information, prices, or policies.
- Keep answers concise and friendly.
- Answer directly without mentioning that you are reading from a document.
"""
    return [
        SystemMessage(content=system_content),
        HumanMessage(content=question)
    ]

class BookMeetingSchema(BaseModel):
    """Schema for booking a meeting."""
    name: str = Field(..., description="The name of the customer booking the meeting.")
    email: str = Field(..., description="The email address of the customer.")
    time: str = Field(..., description="The requested date and time for the meeting. (e.g. 'Tomorrow at 5 PM')")
    notes: str = Field(..., description="Any additional notes or topics for the meeting.")

def ask_question(question: str, widget_id: str = "default", system_prompt: str = None) -> dict:
    """Invokes the RAG chain with retriever filtered by widget_id, returning the answer and source citations."""
    if not os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY") == "your_groq_api_key_here":
        return {"answer": "System Error: GROQ_API_KEY is missing or invalid in the .env file.", "sources": []}

    try:
        docs = []

        # ChromaDB requires {"field": {"$eq": value}} format for metadata filtering
        if widget_id and widget_id != "all":
            try:
                chroma_filter = {"widget_id": {"$eq": widget_id}}
                tenant_retriever = vectorstore.as_retriever(
                    search_kwargs={"k": 5, "filter": chroma_filter}
                )
                docs = tenant_retriever.invoke(question)
            except Exception:
                # Fallback: fetch more unfiltered docs and manually filter by widget_id
                try:
                    fallback_retriever = vectorstore.as_retriever(search_kwargs={"k": 20})
                    all_docs = fallback_retriever.invoke(question)
                    docs = [d for d in all_docs if d.metadata.get("widget_id") == widget_id][:5]
                except Exception:
                    docs = []
        else:
            retriever_all = vectorstore.as_retriever(search_kwargs={"k": 5})
            docs = retriever_all.invoke(question)

        sources = list(set([
            doc.metadata.get("source") for doc in docs
            if doc.metadata and "source" in doc.metadata
        ]))
        context_str = format_docs(docs)

        # Bind the tools
        llm_with_tools = llm.bind_tools([BookMeetingSchema])
        
        # Use direct message construction — avoids template curly-brace parsing errors
        messages = build_messages(question, context_str, system_prompt)
        response = llm_with_tools.invoke(messages)
        
        answer = ""
        # Handle tool calls
        if hasattr(response, 'tool_calls') and len(response.tool_calls) > 0:
            for tc in response.tool_calls:
                if tc['name'] == 'BookMeetingSchema':
                    args = tc['args']
                    # Save to DB
                    try:
                        db = SessionLocal()
                        booking = AgentBooking(
                            widget_id=widget_id,
                            customer_name=args.get('name', 'Unknown'),
                            customer_email=args.get('email', 'Unknown'),
                            booking_time=args.get('time', 'Unknown'),
                            notes=args.get('notes', '')
                        )
                        db.add(booking)
                        db.commit()
                        db.close()
                        answer += f"✅ Great! I've booked your meeting for {args.get('time')} under {args.get('name')} ({args.get('email')}). Our team will be in touch!\n"
                    except Exception as e:
                        print("Error saving booking:", e)
                        answer += "I tried to book your meeting but encountered an internal database error.\n"
        else:
            answer = response.content if hasattr(response, 'content') else str(response)

        # Quick Sentiment Analysis
        sentiment = "Neutral"
        try:
            sentiment_msg = [
                SystemMessage(content="Analyze the sentiment of the following user message. Reply with ONLY ONE WORD: Positive, Neutral, or Negative."),
                HumanMessage(content=question)
            ]
            sentiment_response = llm.invoke(sentiment_msg)
            raw_sentiment = (sentiment_response.content if hasattr(sentiment_response, 'content') else str(sentiment_response)).strip()
            if "Positive" in raw_sentiment or "positive" in raw_sentiment.lower(): sentiment = "Positive"
            elif "Negative" in raw_sentiment or "negative" in raw_sentiment.lower(): sentiment = "Negative"
            else: sentiment = "Neutral"
        except Exception as e:
            print(f"Sentiment analysis failed: {e}")

        return {"answer": answer, "sources": sources, "sentiment": sentiment}
    except Exception as e:
        return {"answer": f"Sorry, I encountered an error: {e}", "sources": [], "sentiment": "Neutral"}

def embed_document(file_path: str, widget_id: str = "default") -> dict:
    """Extracts text from a newly uploaded document (PDF, DOCX, TXT, CSV), chunks it with widget_id metadata, and adds to ChromaDB."""
    print(f"Extracting text from uploaded file: {file_path} (Widget ID: {widget_id})")
    text = ""
    ext = file_path.split('.')[-1].lower()
    
    try:
        if ext == 'pdf':
            doc = fitz.open(file_path)
            for page_num in range(len(doc)):
                text += doc[page_num].get_text()
            doc.close()
        elif ext == 'docx':
            doc = docx.Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        elif ext == 'txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        elif ext == 'csv':
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                for row in reader:
                    text += " ".join(row) + "\n"
        else:
            return {"success": False, "error": "Unsupported file format"}
            
        if not text.strip():
            return {"success": False, "error": f"No text found in {ext.upper()}"}
            
        print("Chunking text...")
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        chunks = text_splitter.split_text(text)
        
        print(f"Adding {len(chunks)} chunks to Chroma DB for tenant '{widget_id}'...")
        filename = os.path.basename(file_path)
        metadatas = [{"source": filename, "widget_id": widget_id, "type": ext} for _ in chunks]
        vectorstore.add_texts(texts=chunks, metadatas=metadatas)
        
        return {"success": True, "chunks_added": len(chunks), "filename": filename, "widget_id": widget_id}
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return {"success": False, "error": str(e)}

def embed_url(url: str, widget_id: str = "default") -> dict:
    """Crawls a web page URL, chunks its text, and adds to ChromaDB with widget_id metadata."""
    from app.web_scraper import scrape_url
    print(f"Scraping & embedding URL: {url} (Widget ID: {widget_id})")
    scraped = scrape_url(url)
    if not scraped.get("success"):
        return scraped
        
    text = scraped.get("content", "")
    title = scraped.get("title", url)
    clean_url = scraped.get("url", url)
    
    try:
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        chunks = text_splitter.split_text(text)
        
        print(f"Adding {len(chunks)} web chunks to Chroma DB for tenant '{widget_id}'...")
        metadatas = [{"source": clean_url, "title": title, "widget_id": widget_id, "type": "web"} for _ in chunks]
        vectorstore.add_texts(texts=chunks, metadatas=metadatas)
        
        return {
            "success": True, 
            "chunks_added": len(chunks), 
            "source": clean_url, 
            "title": title,
            "widget_id": widget_id
        }
    except Exception as e:
        print(f"Error embedding URL: {e}")
        return {"success": False, "error": str(e)}

def delete_document_source(source: str, widget_id: str = "default") -> dict:
    """Deletes vectors matching a specific document source and widget_id."""
    try:
        data = vectorstore._collection.get(include=["metadatas"])
        metas = data.get("metadatas", [])
        ids = data.get("ids", [])
        ids_to_delete = []
        for i, m in enumerate(metas):
            if isinstance(m, dict) and m.get("source") == source:
                if not widget_id or widget_id == "all" or m.get("widget_id") == widget_id or ("widget_id" not in m and widget_id == "default"):
                    ids_to_delete.append(ids[i])
        
        if ids_to_delete:
            vectorstore.delete(ids=ids_to_delete)
            return {"success": True, "message": f"Successfully deleted '{source}' ({len(ids_to_delete)} chunks deleted)."}
        else:
            return {"success": False, "error": f"No document matching '{source}' found."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_active_documents(widget_id: str = "default") -> list:
    """Returns detailed active document objects stored in ChromaDB for a specific widget_id."""
    try:
        data = vectorstore._collection.get(include=["metadatas"])
        metas = data.get("metadatas", [])
        doc_map = {}
        for m in metas:
            if m and isinstance(m, dict) and "source" in m:
                if not widget_id or widget_id == "all" or m.get("widget_id") == widget_id or ("widget_id" not in m and widget_id == "default"):
                    src = m["source"]
                    doc_type = m.get("type", "web" if src.startswith("http") else "pdf")
                    if src not in doc_map:
                        doc_map[src] = {"source": src, "chunks": 0, "type": doc_type, "title": m.get("title", src)}
                    doc_map[src]["chunks"] += 1
        return list(doc_map.values())
    except Exception:
        return []

def get_db_stats(widget_id: str = "default") -> dict:
    """Returns vector store collection stats and active document sources for a tenant."""
    try:
        data = vectorstore._collection.get(include=["metadatas"])
        metas = data.get("metadatas", [])
        matching_chunks = 0
        for m in metas:
            if not widget_id or widget_id == "all" or (isinstance(m, dict) and m.get("widget_id") == widget_id) or (isinstance(m, dict) and "widget_id" not in m and widget_id == "default"):
                matching_chunks += 1

        docs = get_active_documents(widget_id)
        simple_sources = [d["source"] for d in docs]
        return {
            "status": "ok", 
            "total_chunks": matching_chunks, 
            "documents": simple_sources, 
            "detailed_documents": docs,
            "widget_id": widget_id
        }
    except Exception as e:
        return {"status": "error", "total_chunks": 0, "documents": [], "detailed_documents": [], "error": str(e)}

def reset_vectorstore(widget_id: str = "default") -> dict:
    """Resets/deletes vectors in the vector store belonging to a specific widget_id."""
    try:
        if not widget_id or widget_id == "all":
            vectorstore.delete_collection()
        else:
            # Delete entries matching widget_id metadata
            data = vectorstore._collection.get(include=["metadatas"])
            ids_to_delete = []
            metas = data.get("metadatas", [])
            ids = data.get("ids", [])
            for i, m in enumerate(metas):
                if isinstance(m, dict) and (m.get("widget_id") == widget_id or ("widget_id" not in m and widget_id == "default")):
                    ids_to_delete.append(ids[i])
            if ids_to_delete:
                vectorstore.delete(ids=ids_to_delete)

        return {"success": True, "message": f"Knowledge base for '{widget_id}' successfully reset."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def crawl_sitemap(sitemap_url: str, widget_id: str = "default") -> dict:
    """Fetches a sitemap.xml, extracts up to 50 URLs, and embeds them."""
    print(f"Crawling sitemap: {sitemap_url} (Widget ID: {widget_id})")
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(sitemap_url, timeout=15, headers=headers)
        response.raise_for_status()
        
        # Try 'xml' parser, fallback to 'html.parser' if lxml isn't installed
        try:
            soup = BeautifulSoup(response.content, 'xml')
            locs = soup.find_all("loc")
        except Exception:
            soup = BeautifulSoup(response.content, 'html.parser')
            locs = soup.find_all("loc")
            
        urls = []
        for loc in locs:
            url = loc.text.strip()
            if url:
                urls.append(url)
                
        # Limit to 50 URLs for safety
        urls = list(set(urls))[:50]
        
        if not urls:
            return {"success": False, "error": "No valid URLs found in sitemap."}
            
        print(f"Found {len(urls)} URLs. Starting embed process...")
        results = []
        for u in urls:
            res = embed_url(u, widget_id)
            results.append({"url": u, "success": res.get("success", False)})
            
        success_count = sum(1 for r in results if r["success"])
        return {
            "success": True, 
            "message": f"Successfully scraped {success_count} out of {len(urls)} pages from sitemap.",
            "total_urls": len(urls),
            "successful_embeds": success_count
        }
    except Exception as e:
        print(f"Error crawling sitemap: {e}")
        return {"success": False, "error": str(e)}
