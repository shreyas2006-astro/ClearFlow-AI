from fastapi import FastAPI

from .database import Base, engine
from .routers import requests as requests_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NITK Administrative Workflow & Approval System")

app.include_router(requests_router.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "workflow-approval-api"}
