from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    height = Column(String)
    weight = Column(String)
    age = Column(Integer)
    gender = Column(String)
    runiq = Column(Integer)
    stats = Column(Text)  # JSON stored as text
    created_at = Column(DateTime, server_default=func.now())


class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, server_default=func.now())  # when the run happened
    distance_m = Column(Float, nullable=False)           # distance in meters
    duration_s = Column(Integer, nullable=False)          # elapsed time in seconds
    avg_pace = Column(String)                             # e.g. "8:32" (min/mi)
    created_at = Column(DateTime, server_default=func.now())
