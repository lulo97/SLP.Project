import trafilatura
from pypdf import PdfReader
import io
import json
from typing import Optional, Dict, Any

def parse_html(url: str, html_content: Optional[str] = None) -> Dict[str, Any]:
    if html_content:
        result = trafilatura.extract(html_content, output_format="json", with_metadata=True)
    else:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded: raise ValueError("Failed to fetch URL")
        result = trafilatura.extract(downloaded, output_format="json", with_metadata=True)
    data = json.loads(result)
    return {"title": data.get("title"), "raw_text": data.get("text"), "metadata": {"source_type": "html"}}

def parse_pdf(content: bytes) -> Dict[str, Any]:
    reader = PdfReader(io.BytesIO(content))
    text = "".join([page.extract_text() for page in reader.pages])
    return {"title": reader.metadata.get("/Title"), "raw_text": text, "metadata": {"source_type": "pdf"}}

def parse_txt(content: bytes, filename: str) -> Dict[str, Any]:
    text = content.decode("utf-8", errors="replace")
    return {"title": filename, "raw_text": text, "metadata": {"source_type": "txt"}}
