from __future__ import annotations

import mimetypes
import os
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response


ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = Path(os.environ.get("UI_STATIC_DIR", ROOT / "ui")).resolve()
DEV_ASSET_DIR = Path(os.environ.get("UI_DEV_ASSET_DIR", ROOT / "ui" / "dev-assets")).resolve()
UPSTREAM_BASE = os.environ.get("IOT_UPSTREAM_BASE", "http://iot.local:8080").rstrip("/")
PROXY_PREFIXES = ("/api", "/simulator")
HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "content-encoding",
    "host",
}

app = FastAPI(title="IoT UI Local Dev")


def _safe_path(path: str) -> Path:
    candidate = (STATIC_DIR / path.lstrip("/")).resolve()
    if not str(candidate).startswith(str(STATIC_DIR)):
        raise HTTPException(status_code=404, detail="Not found")
    return candidate


def _static_response(path: Path) -> FileResponse:
    media_type, _ = mimetypes.guess_type(path.name)
    response = FileResponse(path, media_type=media_type)
    response.headers["Cache-Control"] = "no-store"
    return response


def _safe_dev_asset_path(path: str) -> Path:
    candidate = (DEV_ASSET_DIR / path.lstrip("/")).resolve()
    if not str(candidate).startswith(str(DEV_ASSET_DIR)) or not candidate.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return candidate


@app.on_event("startup")
async def startup() -> None:
    app.state.client = httpx.AsyncClient(follow_redirects=True, timeout=20.0)


@app.on_event("shutdown")
async def shutdown() -> None:
    await app.state.client.aclose()


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
@app.api_route("/simulator/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy(path: str, request: Request) -> Response:
    upstream_url = f"{UPSTREAM_BASE}{request.url.path}"
    if request.url.query:
        upstream_url = f"{upstream_url}?{request.url.query}"

    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS
    }
    body = await request.body()

    upstream = await app.state.client.request(
        request.method,
        upstream_url,
        headers=headers,
        content=body,
    )

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS
    }
    response_headers["Cache-Control"] = "no-store"

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )


@app.get("/")
async def root() -> FileResponse:
    return _static_response(STATIC_DIR / "index.html")


@app.get("/operations")
async def operations() -> FileResponse:
    return _static_response(STATIC_DIR / "index.html")


@app.get("/graphs")
async def graphs() -> FileResponse:
    return _static_response(STATIC_DIR / "index.html")


@app.get("/dev-assets/{asset_path:path}")
async def dev_asset(asset_path: str) -> FileResponse:
    return _static_response(_safe_dev_asset_path(asset_path))


@app.get("/{asset_path:path}")
async def static_or_spa(asset_path: str) -> FileResponse:
    path = _safe_path(asset_path)
    if path.is_file():
        return _static_response(path)

    if "." not in asset_path:
        return _static_response(STATIC_DIR / "index.html")

    raise HTTPException(status_code=404, detail="Not found")

