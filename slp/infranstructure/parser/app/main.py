import httpx
import magic
import fitz  # PyMuPDF
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, HttpUrl
from typing import Optional
from bs4 import BeautifulSoup

app = FastAPI(title="Source Parser")

class Parser:
    def parse_html_content(self, html_text: str):
        soup = BeautifulSoup(html_text, "html.parser")
        for element in soup(["script", "style", "nav", "footer", "header", "aside", "table"]):
            element.decompose()
        return soup.get_text(separator=" ", strip=True)

    async def parse_html(self, url: str):
        # Adding a User-Agent makes the request look like a real browser
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, headers=headers) as client:
            try:
                response = await client.get(url)
                # This will raise an error if the site returns 403, 404, etc.
                response.raise_for_status() 
            except httpx.HTTPStatusError as e:
                print(f"HTTP Error: {e.response.status_code} for URL: {url}")
                raise Exception(f"Site returned error: {e.response.status_code}")
            except Exception as e:
                print(f"Connection Error: {str(e)}")
                raise Exception(f"Failed to connect to site: {str(e)}")

            soup = BeautifulSoup(response.text, "html.parser")
            title = soup.title.string if soup.title else "No Title"
            content = self.parse_html_content(response.text)
            
            return {
                "title": title.strip(),
                "content": content,
                "url": url
            }

    def parse_pdf(self, content: bytes):
        text = ""
        with fitz.open(stream=content, filetype="pdf") as doc:
            for page in doc:
                text += page.get_text()
        return {"title": "PDF Document", "content": text.strip()}

    def parse_txt(self, content: bytes, filename: str):
        try:
            raw_text = content.decode("utf-8")
        except:
            raw_text = content.decode("latin-1")
        
        if "<html" in raw_text.lower():
            clean_text = self.parse_html_content(raw_text)
        else:
            clean_text = raw_text
        return {"title": filename, "content": clean_text}

parser = Parser()

# --- Endpoints ---

class UrlParseRequest(BaseModel):
    url: HttpUrl
    title: Optional[str] = None

@app.post("/parse/url")
async def parse_url(request: UrlParseRequest):
    try:
        # Don't forget 'await' here!
        result = await parser.parse_html(str(request.url))
        if request.title:
            result["title"] = request.title
        return result
    except Exception as e:
        # This sends the specific error message back to Playwright
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/parse/file")
async def parse_file(file: UploadFile = File(...), title: Optional[str] = Form(None)):
    try:
        content = await file.read()
        mime = magic.from_buffer(content, mime=True)
        if mime == "application/pdf":
            result = parser.parse_pdf(content)
        else:
            result = parser.parse_txt(content, file.filename)
        if title:
            result["title"] = title
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))