import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.base import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./facesense.db")

# For SQLite, ensure connect_args allows multi-threading
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)

