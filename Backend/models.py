from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    name = Column(String)
    height = Column(String)
    weight = Column(String)
    gender = Column(String)

    stats = relationship("Stats", back_populates="user", uselist=False)


class Stats(Base):
    __tablename__ = "stats"

    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    runiq = Column(Integer)
    stats = Column(Text)  # JSON stored as text
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="stats")
