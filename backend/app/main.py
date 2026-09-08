"""FastAPI application factory. Wiring only - no logic lives here."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.config import settings
from app.container import build_container


@asynccontextmanager
async def lifespan(app: FastAPI):
    await build_container()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="FloatChat API",
        version="1.0.0",
        description="Natural-language query and 4D visualisation over ARGO float data.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(v1_router, prefix=settings.api_prefix)

    @app.get("/health", include_in_schema=False)
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
