from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)

def get_session():
    with Session(engine) as session:
        yield session

def init_db():
    # Only create tables if they don't exist. 
    # Usually handled by Drizzle in this architecture, but we define it for completeness.
    SQLModel.metadata.create_all(engine)
