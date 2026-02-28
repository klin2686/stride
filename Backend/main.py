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


@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        name=body.name,
        height=body.height,
        weight=body.weight,
        gender=body.gender,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username}


@app.post("/auth/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"id": user.id, "username": user.username}
