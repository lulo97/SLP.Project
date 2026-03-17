Implement add link source (parse html) and add file source (txt and pdf parse)
- Make a seperate service docker for this

## Design: Source Parsing Microservice

### 1. Purpose
Offload content extraction from external sources (URLs, uploaded files) into a dedicated service to:
- Keep the main backend focused on business logic
- Enable independent scaling and technology choice (Python's rich parsing ecosystem)
- Isolate complex parsing tasks and potential vulnerabilities

### 2. Scope
- **Link (HTML) parsing**: Fetch URL, extract title, main content (cleaned HTML), plain text, and optionally generate TipTap-compatible JSON.
- **File parsing**: Extract text from uploaded PDF and TXT files.
- Return structured data to the main backend for storage in the `source` table (`raw_text`, `raw_html`, `content_json`, `metadata`).

### 3. Technology Stack
| Component      | Technology           | Rationale |
|----------------|----------------------|-----------|
| Framework      | FastAPI (Python)     | Async, automatic OpenAPI docs, easy file handling |
| HTTP client    | `httpx`              | Async, supports timeouts, retries |
| HTML parsing   | `trafilatura`        | Best-in-class for main content extraction, fallback to `beautifulsoup4` |
| PDF parsing    | `pypdf` / `pdfplumber` | Lightweight, handles text extraction |
| File validation| `python-magic`       | Detect MIME types securely |
| Container      | Docker               | Isolated deployment |

### 4. API Design

#### 4.1. Parse URL
**Endpoint**: `POST /parse/url`  
**Request** (JSON):
```json
{
  "url": "https://example.com/article",
  "title": "Optional user-provided title"   // if not provided, service will extract
}
```
**Response** (JSON):
```json
{
  "success": true,
  "data": {
    "title": "Extracted Title",
    "raw_text": "Plain text content...",
    "raw_html": "<html>...<body>...</body></html>",
    "content_json": { ... },                 // optional TipTap JSON structure
    "metadata": {
      "extraction_method": "trafilatura",
      "word_count": 1234,
      "language": "en"
    }
  }
}
```
**Errors**:
- `400` – Invalid URL or missing parameter
- `422` – Unprocessable (e.g., cannot fetch URL)
- `504` – Gateway timeout (fetch took too long)

**Process**:
1. Validate URL format and scheme (http/https only).
2. Fetch URL with timeout (configurable, e.g., 10s) and respect `robots.txt` optionally.
3. Use `trafilatura` to extract main content (cleaned HTML, plain text). Fallback to `beautifulsoup4` if needed.
4. Extract title from HTML `<title>` or use user-provided title.
5. Optionally convert cleaned HTML to TipTap JSON (using a simple converter).
6. Return extracted data.

#### 4.2. Parse File
**Endpoint**: `POST /parse/file`  
**Request**: `multipart/form-data` with field `file` (PDF or TXT).  
Optionally field `title` (string).  
**Response**: Same JSON structure as URL parse (without `raw_html` for files).
**File size limit**: 10 MB (configurable).  
**Supported MIME types**: `text/plain`, `application/pdf` (detected via magic bytes).

**Process**:
1. Validate file size and MIME type.
2. For TXT: read as UTF-8 text.
3. For PDF: use `pypdf` to extract text (may retain basic formatting).
4. Return extracted text (as `raw_text`) and optionally generate `content_json` by splitting into paragraphs.

### 5. Integration with Existing Backend (.NET)

The .NET `SourceService` currently mocks parsing. It will be modified to:

- For URL creation:  
  Call `POST http://parser:8000/parse/url` with the URL and title.  
  On success, populate `Source` fields with returned data (`Title`, `RawText`, `RawHtml`, `ContentJson`, `MetadataJson`).  
  On failure, store minimal info and log error; optionally retry.

- For file upload:  
  After saving the file locally, call `POST http://parser:8000/parse/file` with the file stream.  
  Use the returned `raw_text` and `content_json` to update the source record (already saved with `FilePath`).  
  Optionally, delete the temporary file after parsing (or keep for future reprocessing).

**Error handling**:  
- If parser service is unavailable, return `503 Service Unavailable` to the client.
- Implement circuit breaker / retry policy in .NET for resilience.

### 6. Deployment (Docker)

#### 6.1. Dockerfile (Parser Service)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./app /app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 6.2. docker-compose.yml addition
```yaml
parser:
  build: ./parser
  container_name: parser
  environment:
    - MAX_FILE_SIZE=10485760        # 10 MB
    - REQUEST_TIMEOUT=10            # seconds for URL fetch
  ports:
    - "8000:8000"                   # internal only; not exposed to host
  restart: unless-stopped
  networks:
    - internal
```

#### 6.3. Environment Variables
| Variable         | Description                          | Default |
|------------------|--------------------------------------|---------|
| MAX_FILE_SIZE    | Max uploaded file size (bytes)       | 10485760 |
| REQUEST_TIMEOUT  | Timeout for fetching URLs (seconds)  | 10      |
| LOG_LEVEL        | Logging verbosity                    | INFO    |

### 7. Security Considerations
- **URL validation**: Reject non-http(s) URLs, private IP ranges, loopback addresses (SSRF prevention).
- **File validation**: Check MIME type via magic bytes, not just extension.
- **Rate limiting**: Implement per-IP limits to avoid abuse (can be added at ingress level).
- **Timeouts**: Short timeouts to prevent resource exhaustion.
- **No storage**: Service does not persist files; they are processed in memory or temporary storage deleted after response.

### 8. Future Extensions
- **Async processing**: For large files or slow sites, return a job ID and allow polling.
- **Caching**: Cache parsed content for identical URLs (with TTL) to reduce external requests.
- **TipTap generation**: Enhance content_json to include headings, lists, etc., based on HTML structure.
- **Support more file types**: e.g., DOCX, EPUB.

### 9. API Contract Summary
| Endpoint      | Method | Input                | Output                 |
|---------------|--------|----------------------|------------------------|
| /parse/url    | POST   | JSON { url, title? } | JSON with extracted data |
| /parse/file   | POST   | multipart/file       | JSON with extracted text |

All endpoints return standard HTTP status codes and error messages in JSON:  
`{ "success": false, "error": "Description" }`