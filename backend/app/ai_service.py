import os
import fitz
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter


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

# Create the Prompt Template
template = """You are a helpful and polite customer support assistant for a business.
Your goal is to answer the user's question based strictly on the provided context.

Context: {context}

Question: {question}

Instructions:
- If the answer is not contained within the context, politely say "I don't have that information. Please contact support."
- Do not make up any information, prices, or policies.
- Keep your answers concise and friendly.
- Do not mention that you are reading from a context or document. Just answer the question directly.

Answer:
"""
prompt = ChatPromptTemplate.from_template(template)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# Create the RAG Chain
rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

def ask_question(question: str, widget_id: str = "default") -> str:
    """Invokes the RAG chain with retriever filtered by widget_id."""
    if not os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY") == "your_groq_api_key_here":
        return "System Error: GROQ_API_KEY is missing or invalid in the .env file."
        
    try:
        # Dynamically create filtered retriever for the specific widget_id tenant
        search_filter = {"widget_id": widget_id} if widget_id and widget_id != "all" else {}
        tenant_retriever = vectorstore.as_retriever(search_kwargs={"k": 3, "filter": search_filter} if search_filter else {"k": 3})
        
        tenant_rag_chain = (
            {"context": tenant_retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )
        response = tenant_rag_chain.invoke(question)
        return response
    except Exception as e:
        return f"Sorry, I encountered an error: {e}"

def embed_pdf(pdf_path: str, widget_id: str = "default") -> dict:
    """Extracts text from a newly uploaded PDF, chunks it with widget_id metadata, and adds to ChromaDB."""
    print(f"Extracting text from uploaded file: {pdf_path} (Widget ID: {widget_id})")
    text = ""
    try:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            text += doc[page_num].get_text()
        doc.close()
        
        if not text.strip():
            return {"success": False, "error": "No text found in PDF"}
            
        print("Chunking text...")
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        chunks = text_splitter.split_text(text)
        
        print(f"Adding {len(chunks)} chunks to Chroma DB for tenant '{widget_id}'...")
        filename = os.path.basename(pdf_path)
        metadatas = [{"source": filename, "widget_id": widget_id} for _ in chunks]
        vectorstore.add_texts(texts=chunks, metadatas=metadatas)
        
        return {"success": True, "chunks_added": len(chunks), "filename": filename, "widget_id": widget_id}
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return {"success": False, "error": str(e)}

def get_active_documents(widget_id: str = "default") -> list:
    """Returns unique document names stored in ChromaDB for a specific widget_id."""
    try:
        data = vectorstore._collection.get(include=["metadatas"])
        metas = data.get("metadatas", [])
        sources = set()
        for m in metas:
            if m and isinstance(m, dict) and "source" in m:
                # If widget_id is specified, filter by it
                if not widget_id or widget_id == "all" or m.get("widget_id") == widget_id or ("widget_id" not in m and widget_id == "default"):
                    sources.add(m["source"])
        return list(sources)
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
        return {"status": "ok", "total_chunks": matching_chunks, "documents": docs, "widget_id": widget_id}
    except Exception as e:
        return {"status": "error", "total_chunks": 0, "documents": [], "error": str(e)}

def reset_vectorstore(widget_id: str = "default") -> dict:
    """Resets/deletes vectors in the vector store belonging to a specific widget_id."""
    global vectorstore, retriever, rag_chain
    try:
        if not widget_id or widget_id == "all":
            vectorstore.delete_collection()
            vectorstore = Chroma(
                persist_directory=CHROMA_DB_DIR,
                embedding_function=embeddings_model
            )
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

        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )
        return {"success": True, "message": f"Knowledge base for '{widget_id}' successfully reset."}
    except Exception as e:
        return {"success": False, "error": str(e)}



