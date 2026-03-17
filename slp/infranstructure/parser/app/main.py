import os
import httpx
import magic
import fitz  # PyMuPDF
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, HttpUrl
from typing import Optional
from bs4 import BeautifulSoup

# --- Config ---
# Ensure these names match your docker-compose environment section
PARSER_MAX_FILE_SIZE = int(os.getenv("PARSER_MAX_FILE_SIZE", 20971520))
PARSER_REQUEST_TIMEOUT = float(os.getenv("PARSER_REQUEST_TIMEOUT", 30.0))
PARSER_PORT = int(os.getenv("PARSER_PORT", 8000))

app = FastAPI(title="Source Parser")

# --- Models (Must be defined BEFORE the endpoints) ---
class UrlParseRequest(BaseModel):
    url: HttpUrl
    title: Optional[str] = None

# --- Logic ---
class Parser:
    def parse_html_content(self, html_text: str):
        soup = BeautifulSoup(html_text, "html.parser")
        # Remove junk elements
        for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
            element.decompose()
        return soup.get_text(separator=" ", strip=True)

    async def parse_html(self, url: str):
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=PARSER_REQUEST_TIMEOUT, headers=headers) as client:
            try:
                response = await client.get(url)
                response.raise_for_status() 
            except httpx.TimeoutException:
                raise Exception(f"Request timed out after {PARSER_REQUEST_TIMEOUT}s")
            except Exception as e:
                raise Exception(f"Failed to connect to site: {str(e)}")

            content = self.parse_html_content(response.text)
            soup = BeautifulSoup(response.text, "html.parser")
            title = soup.title.string if soup.title else "No Title"
            
            return {"title": title.strip(), "content": content, "url": url}

    def parse_pdf(self, content: bytes):
        text = ""
        with fitz.open(stream=content, filetype="pdf") as doc:
            for page in doc:
                text += page.get_text()
        return {"title": "PDF Document", "content": text.strip()}

parser = Parser()

# --- Endpoints ---

@app.on_event("startup")
async def startup_event():
    print(f"--- Parser Config ---")
    print(f"PORT: {PARSER_PORT}")
    print(f"TIMEOUT: {PARSER_REQUEST_TIMEOUT}s")
    print(f"MAX_SIZE: {PARSER_MAX_FILE_SIZE} bytes")
    print(f"---------------------")

@app.post("/parse/url")
async def parse_url(request: UrlParseRequest):
    try:
        return await parser.parse_html(str(request.url))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/parse/file")
async def parse_file(file: UploadFile = File(...), title: Optional[str] = Form(None)):
    # 1. Size Check
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > PARSER_MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Max limit is {PARSER_MAX_FILE_SIZE} bytes."
        )

    try:
        content = await file.read()
        mime = magic.from_buffer(content, mime=True)
        
        if mime == "application/pdf":
            result = parser.parse_pdf(content)
        else:
            raw_text = content.decode("utf-8", errors="ignore")
            if "<html" in raw_text.lower():
                result = {"title": file.filename, "content": parser.parse_html_content(raw_text)}
            else:
                result = {"title": file.filename, "content": raw_text}

        if title: 
            result["title"] = title
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))