import pytest
from sqlmodel import SQLModel, create_engine, Session
from app.db.seed import seed_database
import app.db.session as session_module

@pytest.fixture(name="db_session", scope="function")
def fixture_db_session():
    # Use in-memory SQLite for testing
    test_engine = create_engine("sqlite:///:memory:", echo=False, connect_args={"check_same_thread": False})
    
    # Override engine in session_module
    old_engine = session_module.engine
    session_module.engine = test_engine
    
    # Seed test database
    seed_database(test_engine)
    
    with Session(test_engine) as session:
        yield session
        
    session_module.engine = old_engine
