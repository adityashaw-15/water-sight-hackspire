import os
import json
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from datetime import datetime

from models import Base, State, District, Watershed, GeoImage, SyncLog
from providers import OfficialDataProvider, DemoFallbackProvider

DATABASE_URL = "sqlite:///./watersight.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not create tables. Is PostGIS running? Error: {e}")

app = FastAPI(title="Watersight API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Helpers ---
def extract_exif(image_file):
    try:
        img = Image.open(image_file)
        exif_info = img._getexif()
        if not exif_info:
            return None, None, None

        def get_decimal_from_dms(dms, ref):
            degrees = float(dms[0])
            minutes = float(dms[1]) / 60.0
            seconds = float(dms[2]) / 3600.0
            if ref in ['S', 'W']:
                degrees = -degrees
                minutes = -minutes
                seconds = -seconds
            return round(degrees + minutes + seconds, 5)

        gps_info = {}
        date_str = None
        for tag, value in exif_info.items():
            decoded = TAGS.get(tag, tag)
            if decoded == "GPSInfo":
                for t in value:
                    sub_decoded = GPSTAGS.get(t, t)
                    gps_info[sub_decoded] = value[t]
            elif decoded == "DateTimeOriginal":
                date_str = value

        lat, lon = None, None
        if "GPSLatitude" in gps_info and "GPSLatitudeRef" in gps_info:
            lat = get_decimal_from_dms(gps_info["GPSLatitude"], gps_info["GPSLatitudeRef"])
        if "GPSLongitude" in gps_info and "GPSLongitudeRef" in gps_info:
            lon = get_decimal_from_dms(gps_info["GPSLongitude"], gps_info["GPSLongitudeRef"])
            
        capture_date = None
        if date_str:
            try:
                capture_date = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
            except:
                pass

        return lat, lon, capture_date
    except Exception as e:
        print("EXIF extraction error:", e)
        return None, None, None


# --- Endpoints ---

@app.get("/api/states")
def get_states(mode: str = "official", db: Session = Depends(get_db)):
    if mode == "demo":
        return DemoFallbackProvider().get_states()
    return OfficialDataProvider(db).get_states()

@app.get("/api/states/{state_id}/districts")
def get_districts(state_id: int, mode: str = "official", db: Session = Depends(get_db)):
    if mode == "demo":
        return DemoFallbackProvider().get_districts(state_id)
    return OfficialDataProvider(db).get_districts(state_id)

@app.get("/api/districts/{district_id}/projects")
def get_projects(district_id: int, mode: str = "official", db: Session = Depends(get_db)):
    if mode == "demo":
        return DemoFallbackProvider().get_projects(district_id)
    return OfficialDataProvider(db).get_projects(district_id)

@app.post("/api/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    latitude: float = Form(None),
    longitude: float = Form(None),
    watershed_id: int = Form(None),
    category: str = Form("General"),
    description: str = Form(""),
    intervention_type: str = Form(""),
    condition: str = Form(""),
    db: Session = Depends(get_db)
):
    import shutil
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    exif_lat, exif_lon, exif_date = extract_exif(file_path)
    
    final_lat = exif_lat if exif_lat is not None else latitude
    final_lon = exif_lon if exif_lon is not None else longitude
    final_date = exif_date if exif_date is not None else datetime.utcnow()
    
    if final_lat is None or final_lon is None:
        raise HTTPException(status_code=400, detail="GPS metadata not found. Select location manually.")
        
    wkt_geom = f"POINT({final_lon} {final_lat})"
    new_image = GeoImage(
        filename=file.filename,
        category=category,
        description=description,
        capture_date=final_date,
        intervention_type=intervention_type,
        condition=condition,
        geom=wkt_geom,
        watershed_id=watershed_id if watershed_id else None
    )
    db.add(new_image)
    db.commit()
    db.refresh(new_image)
    
    return {
        "status": "success",
        "id": new_image.id,
        "source": "EXIF" if exif_lat is not None else "Manual",
        "latitude": final_lat,
        "longitude": final_lon
    }

@app.get("/api/images")
def get_images(db: Session = Depends(get_db)):
    try:
        images = db.query(GeoImage.id, GeoImage.category, GeoImage.description, GeoImage.capture_date, GeoImage.geom.ST_AsGeoJSON().label('geojson')).all()
        features = []
        for img in images:
            geom = json.loads(img.geojson)
            features.append({
                "type": "Feature",
                "properties": {
                    "id": img.id,
                    "category": img.category,
                    "description": img.description,
                    "date": img.capture_date.isoformat() if img.capture_date else None
                },
                "geometry": geom
            })
        return {"type": "FeatureCollection", "features": features}
    except Exception as e:
        return {"type": "FeatureCollection", "features": []}

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data")
@app.get("/api/data/{dataset}")
def get_geojson(dataset: str):
    file_path = os.path.join(DATA_DIR, f"{dataset}.geojson")
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            return json.load(f)
    return {"type": "FeatureCollection", "features": []}
