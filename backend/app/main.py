import time
import uuid

import structlog
from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import get_db
from app.core.logging import configure_logging

configure_logging()
logger = structlog.get_logger()

_is_prod = settings.ENV == "prod"

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=None if _is_prod else f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    """Tag every request with a correlation id and log it as JSON."""
    correlation_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(correlation_id=correlation_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = correlation_id
    if request.url.path not in ("/health", "/ready", "/metrics"):
        logger.info(
            "request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
        )
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.exception_handler(IntegrityError)
async def integrity_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "Database constraint failed"},
    )


@app.get("/health", tags=["health"])
def health() -> dict:
    """Liveness: the process is up. Checks no dependencies."""
    return {"status": "ok"}


@app.get("/ready", tags=["health"])
def ready(db: Session = Depends(get_db)):
    """Readiness: can we actually serve traffic? Checks the database."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not ready"},
        )
    return {"status": "ready"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# --- Prometheus metrics --------------------------------------------------
# Instrumented with the prometheus_client library directly (no FastAPI
# wrapper): the wrapper pins starlette<1.0, which clashes with our pinned
# starlette==1.0.0, so we record the metrics in a small middleware instead.

# A Counter named "http_requests" is exposed as "http_requests_total".
REQUEST_COUNT = Counter(
    "http_requests",
    "Total HTTP requests",
    ["method", "status"],
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method"],
)

# Probe + scrape endpoints are not real user traffic — keep them out.
_METRICS_EXCLUDE = {"/metrics", "/health", "/ready"}


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Record request count + latency for Prometheus."""
    if request.url.path in _METRICS_EXCLUDE:
        return await call_next(request)
    start = time.perf_counter()
    response = await call_next(request)
    REQUEST_COUNT.labels(request.method, str(response.status_code)).inc()
    REQUEST_LATENCY.labels(request.method).observe(time.perf_counter() - start)
    return response


@app.get("/metrics", include_in_schema=False)
def metrics() -> Response:
    """Prometheus scrape endpoint (see the ServiceMonitor in observability/)."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
