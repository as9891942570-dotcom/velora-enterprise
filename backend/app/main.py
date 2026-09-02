import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.core.config import settings
from app.utils.image_storage import get_uploads_root

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://velora-enterprise.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    headers = dict(exc.headers) if exc.headers else None
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    detail = str(exc) if settings.debug else "Internal server error"
    return JSONResponse(status_code=500, content={"detail": detail})


app.include_router(api_router, prefix="/api/v1")

# Serve uploaded product images at /uploads/products/...
_uploads_dir = get_uploads_root()
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Velora Enterprise API", "docs": "/docs"}
