from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class State(Base):
    __tablename__ = 'states'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    districts = relationship("District", back_populates="state")

class District(Base):
    __tablename__ = 'districts'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    state_id = Column(Integer, ForeignKey('states.id'))
    state = relationship("State", back_populates="districts")
    watersheds = relationship("Watershed", back_populates="district")

class Watershed(Base):
    __tablename__ = 'watersheds'
    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String, index=True)
    district_id = Column(Integer, ForeignKey('districts.id'))
    district = relationship("District", back_populates="watersheds")
    area_covered = Column(Float)
    status = Column(String)
    financial_year = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    images = relationship("GeoImage", back_populates="watershed")

class GeoImage(Base):
    __tablename__ = 'geo_images'
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    category = Column(String)
    description = Column(Text)
    capture_date = Column(DateTime)
    upload_date = Column(DateTime, default=datetime.utcnow)
    intervention_type = Column(String)
    condition = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    watershed_id = Column(Integer, ForeignKey('watersheds.id'), nullable=True)
    watershed = relationship("Watershed", back_populates="images")

class SyncLog(Base):
    __tablename__ = 'sync_logs'
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True)
    last_attempt = Column(DateTime)
    last_success = Column(DateTime)
    status = Column(String)
    error_message = Column(Text)
    record_count = Column(Integer)
