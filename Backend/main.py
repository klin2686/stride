from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models
from models import User
from auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

import json

Base.metadata.create_all(bind=engine)

app = FastAPI()
bearer_scheme = HTTPBearer()

# Allow the Next.js frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterRequest(BaseModel):
    username: str
    password: str
    height: str | None = None
    weight: str | None = None
    age: int | None = None
    gender: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class StrideStats(BaseModel):
    cadence: str
    impact_asymetry: str
    breaking_force: str
    ankle_roll: str
    ground_contact: str


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: Session = Depends(get_db)) -> User:
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
        "height": <height: str>,
        "weight": <weight: str>,
        "age": <age: int>,
        "gender": <gender: str>,
    }
    """
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        height=body.height,
        weight=body.weight,
        age=body.age,
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
        "token_type": "bearer",
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
        "token_type": "bearer",
    }


class ProfileUpdateRequest(BaseModel):
    height: str | None = None      # stored in cm
    weight: str | None = None      # stored in kg
    age: int | None = None
    gender: str | None = None      # "male" | "female" | "other"


@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "runiq": current_user.runiq,
        "height": current_user.height,
        "weight": current_user.weight,
        "age": current_user.age,
        "gender": current_user.gender,
    }


@app.put("/auth/profile")
def update_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update the authenticated user's profile metrics.
    All values are expected in **metric** units (cm, kg).

    Request format:
    {
        "height": <height_cm: str | null>,
        "weight": <weight_kg: str | null>,
        "age": <age: int | null>,
        "gender": <"male" | "female" | "other" | null>
    }
    """
    if body.height is not None:
        current_user.height = body.height
    if body.weight is not None:
        current_user.weight = body.weight
    if body.age is not None:
        current_user.age = body.age
    if body.gender is not None:
        current_user.gender = body.gender

    db.commit()
    db.refresh(current_user)

    return {
        "id": current_user.id,
        "username": current_user.username,
        "height": current_user.height,
        "weight": current_user.weight,
        "age": current_user.age,
        "gender": current_user.gender,
    }


@app.post("/stats/update")
def update(body: StrideStats, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Request format:
    {
        "cadence": <cadence: str>,
        "impact_asymetry": <impact_asymetry: str>,
        "breaking_force": <breaking_force: str>,
        "ankle_roll": <ankle_roll: str>,
        "ground_contact": <ground_contact: str>,
    }
    """
    current_user.stats = json.dumps(body.model_dump())
    db.commit()
    db.refresh(current_user)
    return {"message": "Stats updated successfully"}
