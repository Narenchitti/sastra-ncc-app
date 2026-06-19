from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles
import os

from .api.endpoints import router as api_router
import time
import datetime
from fastapi import Request
from .services.telemetry import current_spans, add_trace

app = FastAPI(title="SASTRA NCC App API", version="1.0.0")

# Telemetry middleware to capture request lifecycle duration
@app.middleware("http")
async def telemetry_middleware(request: Request, call_next):
    path = request.url.path
    if not path.startswith("/api") or path.endswith("/telemetry/traces") or path == "/api/health":
        return await call_next(request)
        
    spans_token = current_spans.set([])
    start_time = time.perf_counter()
    status_code = 500
    
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        spans = current_spans.get()
        current_spans.reset(spans_token)
        
        trace = {
            "path": path,
            "method": request.method,
            "duration_ms": round(duration_ms, 2),
            "status_code": status_code,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "spans": spans or []
        }
        add_trace(trace)

# Mount static files folder
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(api_router, prefix="/api")

# Configure CORS for 2026 Standards
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to SASTRA NCC API (2026 Standard)"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
