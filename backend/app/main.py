import os
import asyncio
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.seed import seed_database
from app.adapters.web import router as web_router
from app.adapters.telegram import router as telegram_router
from app.adapters.whatsapp import router as whatsapp_router

logger = logging.getLogger(__name__)

async def auto_place_poller_task():
    """Background poller checking for overdue AUTO_PENDING drafts and executing safe auto-place."""
    from app.core.autoplace import poll_and_execute_overdue_autoplaces
    from app.db.session import engine
    from sqlmodel import Session

    # 1. Immediate scan of overdue rows on restart / startup
    try:
        with Session(engine) as session:
            poll_and_execute_overdue_autoplaces(session)
    except Exception as e:
        logger.error(f"Error in initial auto-place scan: {e}")

    # 2. Periodic polling loop
    while True:
        try:
            await asyncio.sleep(2)
            with Session(engine) as session:
                poll_and_execute_overdue_autoplaces(session)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in auto-place poller loop: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed database on startup
    seed_database()
    is_vercel = os.environ.get("VERCEL") == "1" or os.environ.get("VERCEL_ENV") is not None
    poller = None
    if not is_vercel:
        poller = asyncio.create_task(auto_place_poller_task())
    yield
    if poller:
        poller.cancel()
        try:
            await poller
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title="Paytm Vriddhi - Munim Kirana Assistant API",
    version="1.0.0",
    description="Voice-first, Hinglish-speaking procurement assistant for Kirana merchants",
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Adapters
app.include_router(web_router)
app.include_router(telegram_router)
app.include_router(whatsapp_router)

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "app": "paytm-vriddhi-munim",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)

