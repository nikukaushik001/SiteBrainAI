import os
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Load env variables
load_dotenv()

# We need the Chroma DB path
# Since we run uvicorn from the backend/ directory, the path should be ./scripts/chroma_db if it was created there.
# Let's use an absolute or relative path based on the project root.
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
