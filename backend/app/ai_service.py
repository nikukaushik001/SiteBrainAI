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

def ask_question(question: str) -> str:
    """Invokes the RAG chain with the given question."""
    if not os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY") == "your_groq_api_key_here":
        return "System Error: GROQ_API_KEY is missing or invalid in the .env file."
        
    try:
        response = rag_chain.invoke(question)
        return response
    except Exception as e:
        return f"Sorry, I encountered an error: {e}"

def embed_pdf(pdf_path: str) -> dict:
    """Extracts text from a newly uploaded PDF, chunks it, and adds to ChromaDB."""
    print(f"Extracting text from uploaded file: {pdf_path}")
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
        
        print(f"Adding {len(chunks)} chunks to Chroma DB...")
        filename = os.path.basename(pdf_path)
        metadatas = [{"source": filename} for _ in chunks]
        vectorstore.add_texts(texts=chunks, metadatas=metadatas)
        
        return {"success": True, "chunks_added": len(chunks), "filename": filename}
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return {"success": False, "error": str(e)}

def get_active_documents() -> list:
    """Returns unique document names stored in ChromaDB."""
    try:
        data = vectorstore._collection.get(include=["metadatas"])
        metas = data.get("metadatas", [])
        sources = set()
        for m in metas:
            if m and isinstance(m, dict) and "source" in m:
                sources.add(m["source"])
        return list(sources)
    except Exception:
        return []

def get_db_stats() -> dict:
    """Returns vector store collection stats and active document sources."""
    try:
        count = vectorstore._collection.count()
        docs = get_active_documents()
        return {"status": "ok", "total_chunks": count, "documents": docs}
    except Exception as e:
        return {"status": "error", "total_chunks": 0, "documents": [], "error": str(e)}

def reset_vectorstore() -> dict:
    """Resets/deletes all vectors in the vector store."""
    global vectorstore, retriever, rag_chain
    try:
        # Delete collection content
        vectorstore.delete_collection()
        # Re-initialize collection
        vectorstore = Chroma(
            persist_directory=CHROMA_DB_DIR,
            embedding_function=embeddings_model
        )
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )
        return {"success": True, "message": "Knowledge base vector store successfully reset."}
    except Exception as e:
        return {"success": False, "error": str(e)}


