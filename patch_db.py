with open('app.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re

new_model = """
class AnalysisJob(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    evidence_id = db.Column(db.String(36), nullable=True)
    scene_id = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(50), default='queued')
    progress = db.Column(db.Integer, default=0)
    current_step = db.Column(db.String(200), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    resolution = db.Column(db.Integer, default=20)
    cloud_threshold = db.Column(db.Integer, default=20)
    acquisition_date = db.Column(db.String(100), nullable=True)
    cloud_cover = db.Column(db.Float, nullable=True)
    crs = db.Column(db.String(50), nullable=True)
    bounds = db.Column(db.String(200), nullable=True) # JSON string
    
    ndvi_mean = db.Column(db.Float, nullable=True)
    ndvi_min = db.Column(db.Float, nullable=True)
    ndvi_max = db.Column(db.Float, nullable=True)
    ndvi_median = db.Column(db.Float, nullable=True)
    ndvi_std = db.Column(db.Float, nullable=True)
    ndvi_valid_pixels = db.Column(db.Integer, nullable=True)
    
    ndwi_mean = db.Column(db.Float, nullable=True)
    ndwi_min = db.Column(db.Float, nullable=True)
    ndwi_max = db.Column(db.Float, nullable=True)
    ndwi_median = db.Column(db.Float, nullable=True)
    ndwi_valid_pixels = db.Column(db.Integer, nullable=True)
    ndwi_water_pixels = db.Column(db.Integer, nullable=True)
    
    cloud_percentage = db.Column(db.Float, nullable=True)
    
    output_directory = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.Text, nullable=True)

"""

if "class AnalysisJob" not in text:
    text = text.replace("class User(UserMixin, db.Model):", new_model + "class User(UserMixin, db.Model):")
    with open('app.py', 'w', encoding='utf-8') as f:
        f.write(text)

import sqlite3
try:
    conn = sqlite3.connect('watersight.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS analysis_job (
        id VARCHAR(36) PRIMARY KEY,
        user_id INTEGER,
        evidence_id VARCHAR(36),
        scene_id VARCHAR(200),
        status VARCHAR(50),
        progress INTEGER,
        current_step VARCHAR(200),
        latitude FLOAT,
        longitude FLOAT,
        resolution INTEGER,
        cloud_threshold INTEGER,
        acquisition_date VARCHAR(100),
        cloud_cover FLOAT,
        crs VARCHAR(50),
        bounds VARCHAR(200),
        ndvi_mean FLOAT,
        ndvi_min FLOAT,
        ndvi_max FLOAT,
        ndvi_median FLOAT,
        ndvi_std FLOAT,
        ndvi_valid_pixels INTEGER,
        ndwi_mean FLOAT,
        ndwi_min FLOAT,
        ndwi_max FLOAT,
        ndwi_median FLOAT,
        ndwi_valid_pixels INTEGER,
        ndwi_water_pixels INTEGER,
        cloud_percentage FLOAT,
        output_directory VARCHAR(500),
        created_at DATETIME,
        completed_at DATETIME,
        error_message TEXT,
        FOREIGN KEY(user_id) REFERENCES user(id)
    )
    ''')
    conn.commit()
    conn.close()
    print("Database updated!")
except Exception as e:
    print("DB Error:", e)
