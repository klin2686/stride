from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models
from models import User
from auth import create_access_token, decode_access_token, hash_password, verify_password

Base.metadata.create_all(bind=engine)

app = FastAPI()
bearer_scheme = HTTPBearer()


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


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.get("/")
def read_root():
    return {"Backend Online": True}


@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """
    Request format:
    {
        "username": <username: str>,
        "password": <password: str>,
        "name": <name: str>,
        "height": <name: str>,
        "weight": <weight: str>,
        "gender": <gender: str>,
    }
    """
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
    token = create_access_token(user.id, user.username)
    return {
        "id": user.id,
        "username": user.username,
        "access_token": token,
        "token_type": "bearer"
    }


@app.post("/auth/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    Request format:
    {
        "username": <username: str>,
        "password": <password: str>
    }
    """
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(user.id, user.username)
    return {
        "id": user.id,
        "username": user.username,
        "access_token": token,
        "token_type": "bearer"
    }


@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "runiq": current_user.runiq
    }
