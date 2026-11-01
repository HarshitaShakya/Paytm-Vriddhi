import os
from sqlmodel import SQLModel, create_engine, Session

# Always use canonical absolute path to backend/vriddhi.db so all runners and webhooks share the exact same DB
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DB_PATH = os.path.join(BACKEND_DIR, "vriddhi.db")

is_vercel = os.environ.get("VERCEL") == "1" or os.environ.get("VERCEL_ENV") is not None
if is_vercel:
    tmp_db = "/tmp/vriddhi.db"
    orig_db = os.path.join(BACKEND_DIR, "vriddhi.db")
    if not os.path.exists(tmp_db) and os.path.exists(orig_db):
        import shutil
        try:
            shutil.copyfile(orig_db, tmp_db)
        except Exception:
            pass
    DB_PATH = tmp_db

DEFAULT_DB_URL = f"sqlite:///{DB_PATH.replace(os.sep, '/')}"
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL or DATABASE_URL.startswith("sqlite:///./") or DATABASE_URL == "sqlite:///./vriddhi.db":
    DATABASE_URL = DEFAULT_DB_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def init_db(target_engine=None):
    use_engine = target_engine or engine
    SQLModel.metadata.create_all(use_engine)
    
    # Run lightweight schema migrations for existing SQLite tables
    from sqlalchemy import text
    try:
        with use_engine.connect() as conn:
            # Check merchants columns
            res = conn.execute(text("PRAGMA table_info(merchants)"))
            cols = {row[1] for row in res.fetchall()}
            if cols:
                if "voice_confirm_limit" not in cols:
                    conn.execute(text("ALTER TABLE merchants ADD COLUMN voice_confirm_limit NUMERIC DEFAULT 15000.00"))
                if "auto_place_enabled" not in cols:
                    conn.execute(text("ALTER TABLE merchants ADD COLUMN auto_place_enabled BOOLEAN DEFAULT 0"))
                if "auto_place_max_total" not in cols:
                    conn.execute(text("ALTER TABLE merchants ADD COLUMN auto_place_max_total NUMERIC DEFAULT 5000.00"))
                if "auto_place_delay_seconds" not in cols:
                    conn.execute(text("ALTER TABLE merchants ADD COLUMN auto_place_delay_seconds INTEGER DEFAULT 60"))
                if "auto_place_tolerance_pct" not in cols:
                    conn.execute(text("ALTER TABLE merchants ADD COLUMN auto_place_tolerance_pct FLOAT DEFAULT 5.0"))
                if "usual_supplier_id" not in cols:
                    conn.execute(text("ALTER TABLE merchants ADD COLUMN usual_supplier_id VARCHAR NULL"))

            # Check drafts columns
            res = conn.execute(text("PRAGMA table_info(drafts)"))
            cols = {row[1] for row in res.fetchall()}
            if cols:
                if "auto_place_at" not in cols:
                    conn.execute(text("ALTER TABLE drafts ADD COLUMN auto_place_at DATETIME NULL"))
                if "confidence_score" not in cols:
                    conn.execute(text("ALTER TABLE drafts ADD COLUMN confidence_score FLOAT NULL"))

            # Check orders columns
            res = conn.execute(text("PRAGMA table_info(orders)"))
            cols = {row[1] for row in res.fetchall()}
            if cols:
                if "source" not in cols:
                    conn.execute(text("ALTER TABLE orders ADD COLUMN source VARCHAR DEFAULT 'manual'"))
            conn.commit()
    except Exception:
        pass

def get_session():
    with Session(engine) as session:
        yield session
