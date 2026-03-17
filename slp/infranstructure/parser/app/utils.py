import re
import ipaddress
from urllib.parse import urlparse
from fastapi import HTTPException, UploadFile
import magic

MAX_FILE_SIZE = {"application/pdf": 20 * 1024 * 1024, "text/plain": 5 * 1024 * 1024}
ALLOWED_MIME_TYPES = {"application/pdf", "text/plain"}

def validate_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"): return False
        hostname = parsed.hostname
        if not hostname: return False
        if re.match(r"^[\d\.]+", hostname):
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback: return False
        return True
    except: return False

async def validate_file(file: UploadFile) -> bytes:
    content = await file.read()
    mime = magic.from_buffer(content, mime=True)
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {mime}")
    limit = MAX_FILE_SIZE.get(mime, 0)
    if len(content) > limit:
        raise HTTPException(status_code=400, detail="File too large")
    return content
