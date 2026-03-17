"""
Avatar / file-storage microservice.
Endpoints:
  POST   /upload            – upload a JPEG or PNG (multipart), returns { filename }
  GET    /files/{filename}  – serve a stored file
  DELETE /files/{filename}  – delete a stored file
Authentication for mutating endpoints: X-API-Key header.
The full public URL is never constructed here; callers combine their own
FILESTORAGE_BASE_URL env var with the returned filename.
"""

import os
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Configuration (all overridable via environment variables)
# ---------------------------------------------------------------------------
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/data/files"))
API_KEY    = os.getenv("FILESTORAGE_API_KEY", "changeme")
MAX_BYTES  = 2 * 1024 * 1024          # 2 MB
ALLOWED_MIME = {"image/jpeg", "image/png"}
ALLOWED_EXT  = {".jpg", ".jpeg", ".png"}

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
app = FastAPI(title="File Storage Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _require_api_key(x_api_key: str | None) -> None:
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


def _safe_filename(filename: str) -> Path:
    """Return the absolute path for filename; raise 404 if it does not exist."""
    path = (UPLOAD_DIR / filename).resolve()
    # Prevent path traversal
    if not str(path).startswith(str(UPLOAD_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return path


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(default=None),
):
    """Upload a JPEG or PNG avatar.  Returns { filename } — the bare filename only.
    The caller constructs the full public URL using its own base-URL config."""
    _require_api_key(x_api_key)

    # --- MIME type check ---
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{file.content_type}'. Allowed: JPEG, PNG.",
        )

    # --- Extension ---
    original_ext = Path(file.filename or "").suffix.lower()
    if original_ext not in ALLOWED_EXT:
        # Derive extension from MIME type as fallback
        original_ext = ".jpg" if file.content_type == "image/jpeg" else ".png"

    # --- Read & size check ---
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_BYTES // 1024 // 1024} MB.",
        )

    # --- Persist ---
    filename = f"{uuid.uuid4().hex}{original_ext}"
    dest = UPLOAD_DIR / filename
    dest.write_bytes(data)

    return {"filename": filename}


@app.get("/files/{filename}")
def serve_file(filename: str):
    """Serve a previously uploaded file."""
    path = _safe_filename(filename)
    return FileResponse(path)


@app.delete("/files/{filename}", status_code=204)
def delete_file(
    filename: str,
    x_api_key: str | None = Header(default=None),
):
    """Delete a stored file."""
    _require_api_key(x_api_key)
    path = _safe_filename(filename)
    path.unlink(missing_ok=True)
    return None