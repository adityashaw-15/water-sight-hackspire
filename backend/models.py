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

from flask_login import UserMixin
class User(Base, UserMixin):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)
    google_sub = Column(String, unique=True, index=True, nullable=True)
    profile_picture = Column(String, nullable=True)
    auth_provider = Column(String, default="local")
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

class AnalysisJob(Base):
    __tablename__ = 'analysis_jobs'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    satellite_scene_id = Column(String)
    aoi_id = Column(String)
    status = Column(String, default='queued')
    progress = Column(Integer, default=0)
    current_step = Column(String, default='Waiting in queue')
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

class AnalysisResult(Base):
    __tablename__ = 'analysis_results'
    id = Column(Integer, primary_key=True, index=True)
    analysis_job_id = Column(Integer, ForeignKey('analysis_jobs.id'))
    satellite_scene_id = Column(String)
    aoi_id = Column(String)
    baseline_date = Column(String, nullable=True)
    current_date = Column(String, nullable=True)
    aoi_area_km2 = Column(Float, nullable=True)
    cloud_percentage = Column(Float, nullable=True)
    valid_pixel_percentage = Column(Float, nullable=True)
    mean_ndvi = Column(Float, nullable=True)
    vegetation_area_ha = Column(Float, nullable=True)
    mean_ndwi = Column(Float, nullable=True)
    water_area_ha = Column(Float, nullable=True)
    water_percentage = Column(Float, nullable=True)
    ndvi_change = Column(Float, nullable=True)
    water_change = Column(Float, nullable=True)
    processing_time_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FieldEvidence(Base):
    __tablename__ = 'field_evidence'
    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    original_filename = Column(String)
    stored_filename = Column(String)
    category = Column(String)
    description = Column(Text)
    file_path = Column(String)
    mime_type = Column(String)
    file_size = Column(Integer)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    gps_source = Column(String)
    accuracy_m = Column(Float, nullable=True)
    altitude_m = Column(Float, nullable=True)
    heading_deg = Column(Float, nullable=True)
    speed_mps = Column(Float, nullable=True)
    exif_json = Column(Text, nullable=True)
    status = Column(String, default="active")
