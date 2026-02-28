from sqlalchemy import Column, Integer, String, Text, DateTime
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
