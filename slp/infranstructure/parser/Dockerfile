FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libmagic1 \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /app/app

# Default environment variables
ENV MAX_FILE_SIZE=20971520 \
    REQUEST_TIMEOUT=30 \
    PARSER_PORT=8000

# Use shell form to allow variable expansion
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PARSER_PORT}