from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import event
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)

def get_tenant_engine(tenant_id: str):
    """
    Returns a SQLAlchemy engine that strictly enforces Row-Level Security (RLS)
    by injecting the tenant_id into every database connection checked out from the pool.
    """
    tenant_engine = create_engine(settings.DATABASE_URL, echo=False)
    
    @event.listens_for(tenant_engine, "checkout")
    def on_checkout(dbapi_connection, connection_record, connection_proxy):
        cursor = dbapi_connection.cursor()
        cursor.execute("SET app.tenant_id = %s", (tenant_id,))
        cursor.close()
        
    return tenant_engine

def get_session():
    with Session(engine) as session:
        yield session

def init_db():
    # Only create tables if they don't exist. 
    # Usually handled by Drizzle in this architecture, but we define it for completeness.
    SQLModel.metadata.create_all(engine)
