FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for build and sqlite
RUN apt-get update && apt-get install -y gcc sqlite3 libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Create directory for vector store to avoid permission issues
RUN mkdir -p chroma_db

ENV PYTHONPATH=/app
ENV PORT=8000

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
