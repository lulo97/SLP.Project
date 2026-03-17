## Design: LLM & TTS Caching for a Small VPS

### 1. Problem Statement

You have a small VPS with insufficient RAM/CPU to run a local LLM (e.g., via Docker) and potentially also too limited for a real-time TTS engine like Piper. However, your application requires occasional LLM-generated explanations/grammar checks and TTS audio. The solution is to pre‑generate these resources on a powerful local development machine and push the cached results to the VPS, so the production service can serve them without ever calling the heavy services. The VPS must gracefully handle cache misses and service unavailability.

### 2. Overall Approach

- **LLM caching** – Reuse the existing `llm_log` table (PostgreSQL) but adapt the cache lookup to be **global** (independent of user). Pre‑generate responses for anticipated requests on the dev machine and replicate those log entries to the production database.

- **TTS caching** – Introduce a simple file‑based cache for Piper audio. Store generated WAV files keyed by a hash of the input text (and optionally voice parameters). The piper‑gateway will serve audio directly from the cache when possible; if not, and if the Piper backend is unavailable, it returns an error.

- **Sync process** – A script on the dev machine generates LLM/TTS data for a predefined set of inputs (or based on actual usage logs) and transfers the results to the VPS.

- **Error handling** – When a cache miss occurs and the underlying service is not reachable, the API returns a clear 503 error with a friendly message. Health checks and graceful degradation are built in.

### 3. LLM Cache Design

#### 3.1. Current State

- The `llm_log` table stores every LLM request with columns: `user_id`, `request_type`, `prompt`, `response`, `status`, etc.
- `ILlmLogRepository.FindCachedAsync` searches for a completed log with the same `user_id`, `request_type`, and `prompt`.
- The cache is **per‑user**, which prevents sharing common responses across users.

#### 3.2. Proposed Modifications

- **Make the cache global** by allowing `user_id = NULL` in cache entries. Modify the cache lookup to match either the specific `user_id` **or** `NULL`. This way, pre‑generated entries with `user_id = NULL` serve all users.

- **Optional unique constraint** – To avoid duplicate cache entries for the same prompt, you may add a unique index on `(request_type, prompt)` where `user_id IS NULL`. This is not strictly required – the lookup can just pick the most recent entry – but it keeps the table clean.

- **Pre‑generation** – On the dev machine, run a script that:
  1. Reads a list of expected prompts (e.g., from a file or from production logs exported earlier).
  2. For each prompt, calls the local LLM and stores the result in the dev database with `user_id = NULL` and `status = 'Completed'`.
  3. Exports these rows (or replicates them) to the production database.

#### 3.3. Database Schema Update (Optional)

```sql
-- Add a unique constraint to prevent duplicate global cache entries
CREATE UNIQUE INDEX idx_llm_log_global_unique 
ON llm_log (request_type, prompt) 
WHERE user_id IS NULL;
```

#### 3.4. Cache Lookup Logic (Pseudocode)

```
function FindCached(request_type, prompt, user_id):
    SELECT * FROM llm_log
    WHERE request_type = @request_type
      AND prompt = @prompt
      AND (user_id = @user_id OR user_id IS NULL)
      AND status = 'Completed'
    ORDER BY created_at DESC
    LIMIT 1
```

### 4. TTS Cache Design

#### 4.1. Current State

- The `piper-gateway` (Python/FastAPI) streams audio from a Piper TCP server. It has no caching.

#### 4.2. Proposed Caching Layer

- **Cache storage** – Use the filesystem. A configurable directory (e.g., `/var/cache/tts`) stores WAV files named by a hash of the input text (and optionally voice parameters). Example: `sha256(text).wav`.

- **Cache key** – The raw input `text` (plus any voice settings like speaker id, model). For simplicity, assume a single default voice; otherwise include voice in the hash.

- **Workflow**:
  1. On a TTS request, compute the cache key.
  2. If the corresponding file exists, stream it directly (send the WAV header + file content).
  3. If not, and the Piper backend is **enabled and reachable**, call Piper, capture the audio stream, save it to the cache file, and serve it.
  4. If Piper is disabled/unreachable and the cache misses, return HTTP 503 with a message.

- **Configuration** – Add environment variables to the piper‑gateway:
  - `TTS_CACHE_DIR` (default: `/tmp/tts_cache`)
  - `PIPER_ENABLED` (boolean, default `true`) – allows running the gateway in cache‑only mode on the VPS.
  - `PIPER_HOST` / `PIPER_PORT` (used only when enabled).

#### 4.3. Pre‑generation

- On the dev machine, run a script that:
  1. Reads a list of target texts (e.g., from a file).
  2. For each text, calls the local Piper TCP server, receives the audio, and writes it to a local cache directory using the same hashed filename.
  3. Uses `rsync` (or a similar tool) to synchronise the entire cache directory to the VPS.

- **Alternative** – If you want to store audio in the database (e.g., for easier backup), you could create a `tts_cache` table with columns `text_hash`, `audio_data` (bytea), and `created_at`. The gateway would then query this table. However, filesystem caching is simpler and more efficient for streaming large audio.

#### 4.4. Piper Gateway Modifications (Conceptual)

```python
@app.get("/tts")
async def tts(text: str):
    cache_key = hashlib.sha256(text.encode()).hexdigest()
    cache_path = os.path.join(CACHE_DIR, f"{cache_key}.wav")
    
    # Cache hit
    if os.path.exists(cache_path):
        return FileResponse(cache_path, media_type="audio/wav")
    
    # Cache miss – check if Piper is enabled
    if not PIPER_ENABLED:
        raise HTTPException(503, "TTS service unavailable (cache miss)")
    
    # Try to connect to Piper, generate, and cache
    try:
        audio_data = await generate_from_piper(text)
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(cache_path, "wb") as f:
            f.write(audio_data)
        return StreamingResponse(iter([audio_data]), media_type="audio/wav")
    except Exception:
        raise HTTPException(503, "TTS service unavailable")
```

### 5. Sync Process (Dev → VPS)

#### 5.1. LLM Cache Sync

- **Export from dev** – Script connects to dev PostgreSQL, selects rows from `llm_log` that are suitable for global cache (e.g., where `user_id` is a special “system” account or where you manually mark them). It exports these as SQL inserts or CSV.

- **Import to prod** – Run the inserts on the production database. To avoid duplicates, you can use `ON CONFLICT DO NOTHING` if a unique constraint exists, or simply insert and let the lookup pick the newest.

- **Frequency** – This can be a manual step before deployment, or automated via a cron job that pushes newly generated entries.

#### 5.2. TTS Cache Sync

- **Local generation** – On the dev machine, a script reads a list of texts (maybe from a file `texts.txt`) and for each, calls the local Piper TCP server, saves the WAV file in a local directory with the hashed name.

- **Transfer** – Use `rsync -avz /local/cache/ user@vps:/var/cache/tts/` to synchronise the entire cache directory to the VPS.

- **Incremental updates** – Since audio files are immutable, you can simply overwrite or add new files.

### 6. Deployment Considerations on VPS

- **LLM backend** – Not run. The backend API will only serve cached responses. If a cache miss occurs, it will attempt to call the LLM (if the URL is configured) and fail, returning 503. You may want to disable the queue (`Queue:Enabled = false`) to avoid background jobs trying to reach the LLM.

- **Piper gateway** – Run in **cache‑only mode** (`PIPER_ENABLED = false`). The Piper TCP server is not installed. The gateway will serve only cached audio.

- **Health checks** – The backend’s `CheckLlmConnectionAsync` will warn that the LLM is unreachable – this is expected and can be ignored. The piper‑gateway can have a health endpoint that reports cache‑only mode.

- **Resource usage** – With no LLM or Piper running, the VPS only needs to run the .NET backend, PostgreSQL, Redis (optional), and the lightweight Python gateway. This should fit a small machine.

### 7. Error Handling & Graceful Degradation

- **Cache miss + service disabled** – Both the backend (for LLM) and the piper‑gateway (for TTS) will return HTTP 503 with a JSON error body like `{ "error": "Service temporarily unavailable" }`. The frontend can display a user‑friendly message.

- **Cache miss + service enabled but unreachable** – The same 503 is returned after a timeout or connection error.

- **Startup checks** – The backend already logs a warning if the LLM is unreachable; this is non‑fatal. The piper‑gateway can similarly log a warning on startup if Piper is enabled but unreachable, or just operate in cache‑only mode.

### 8. Additional Considerations

- **Cache invalidation** – If the LLM model or TTS voice changes, previously generated cache entries may become outdated. You can handle this by versioning the cache key (e.g., include a model hash) or by clearing the cache and regenerating.

- **User‑specific content** – If some LLM requests contain private user data (e.g., personal notes), caching them globally would leak information. In that case, you should either:
  - Keep per‑user caching and not pre‑generate such content.
  - Or ensure that prompts containing PII are never cached globally (e.g., exclude them based on a flag).

- **Cache size management** – The TTS cache directory can grow large. Implement a simple cleanup policy (e.g., delete files older than X days) or use a tool like `tmpwatch`.

- **Monitoring** – Add metrics to track cache hit/miss ratios so you know which texts/prompts are missing and need pre‑generation.

### 9. Summary of Changes

| Component          | Change |
|--------------------|--------|
| Backend (`LlmController`) | Modify cache lookup to include `user_id IS NULL`. |
| `ILlmLogRepository`       | Update `FindCachedAsync` to match either user or NULL. |
| Database (`llm_log`)      | (Optional) add unique index for global cache. |
| Piper gateway             | Add file‑based cache with configurable directory and cache‑only mode. |
| Dev machine               | Create scripts to pre‑generate LLM responses and TTS audio, and sync to VPS. |
| Deployment                | Disable LLM queue and Piper on VPS; rely on cache. |

This design allows your small VPS to serve LLM and TTS responses with minimal resource consumption, while still providing the full functionality when the cache is populated. All error cases are handled gracefully.