from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .database import Base, engine
from .routers import requests as requests_router
from .auth_stub import fake_login

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NITK Administrative Workflow & Approval System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(requests_router.router)


class LoginRequest(BaseModel):
    username: str


@app.post("/auth/iris_stub")
def login_stub(req: LoginRequest):
    return fake_login(req.username)


@app.get("/")
def root():
    return {"status": "ok", "service": "workflow-approval-api"}
