from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models
from models import User
from auth import hash_password, verify_password

Base.metadata.create_all(bind=engine)

app = FastAPI()


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str | None = None
    height: str | None = None
    weight: str | None = None
    gender: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


@app.get("/")
def read_root():
    return {"Backend Online": True}
