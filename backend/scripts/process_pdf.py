import os
from dotenv import load_dotenv
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# Load environment variables
load_dotenv()

# We will save the vector database locally in this folder
CHROMA_DB_DIR = "./chroma_db"

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extracts text from a given PDF file."""
    print(f"Extracting text from: {pdf_path}")
    text = ""
    try:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text += page.get_text()
        print("Successfully extracted text.")
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def chunk_text(text: str):
    """Splits text into smaller chunks for embeddings."""
    print("Chunking text...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    chunks = text_splitter.split_text(text)
    print(f"Created {len(chunks)} chunks.")
    return chunks

def process_and_upload(pdf_path: str):
    # 1. Extract Text
    raw_text = extract_text_from_pdf(pdf_path)
    if not raw_text:
        return

    # 2. Chunk Text
    chunks = chunk_text(raw_text)

    # 3. Initialize Embedding Model
    print("Loading HuggingFace Embeddings model (this might take a minute on first run)...")
    # all-MiniLM-L6-v2 is a small, fast, free, and effective embedding model
    embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 4. Initialize Local Chroma Database
    print(f"Saving embeddings locally to ChromaDB directory: {CHROMA_DB_DIR}...")
    
    # Create the vector store and add documents
    # Chroma handles creating the SQLite file and uploading the embeddings behind the scenes
    vectorstore = Chroma.from_texts(
        texts=chunks,
        embedding=embeddings_model,
        persist_directory=CHROMA_DB_DIR
    )
    
    print(f"Process complete! Successfully added {len(chunks)} chunks to ChromaDB.")
    print("You no longer need API keys for the vector database!")

if __name__ == "__main__":
    # To run this, place a sample.pdf in the scripts folder
    sample_pdf_path = "sample.pdf"
    if not os.path.exists(sample_pdf_path):
        print(f"Please place a '{sample_pdf_path}' in the scripts directory to test.")
    else:
        process_and_upload(sample_pdf_path)

