import os
from flask import Flask, jsonify, redirect, render_template, request, url_for, flash, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from authlib.integrations.flask_client import OAuth
from exif_utils import extract_gps_data
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from datetime import datetime

# Adjust Python path if needed or just import directly
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from backend.models import Base, User
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv(override=True)

print('--- CDSE CONFIGURATION ---')
print(f'CDSE_CLIENT_ID configured: {"yes" if os.environ.get("CDSE_CLIENT_ID") else "no"}')
print(f'CDSE_CLIENT_SECRET configured: {"yes" if os.environ.get("CDSE_CLIENT_SECRET") else "no"}')
print('--------------------------')


app = Flask(__name__)
from projects_service import projects_bp
app.register_blueprint(projects_bp)

from analysis_service import analysis_bp
app.register_blueprint(analysis_bp)

app.secret_key = os.environ.get("SECRET_KEY", "dev-change-me")

app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # 20 MB limit
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'images')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax"
)

# Database Setup
engine = create_engine(os.environ.get("DATABASE_URL", "sqlite:///./backend/watersight.db"))
Base.metadata.create_all(engine) # Creates missing tables safely
SessionLocal = sessionmaker(bind=engine)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

@login_manager.user_loader
def load_user(user_id):
    db = SessionLocal()
    user = db.query(User).get(int(user_id))
    db.close()
    return user

# OAuth Setup
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

@app.route("/")
def index():
    return render_template("dashboard.html")

@app.route("/dashboard")
@app.route("/map")
@app.route("/change-analysis")
@app.route("/geo-images")
@app.route("/satellite")
@app.route("/interventions")
@app.route("/analytics")
@app.route("/reports")
@login_required
def dashboard():
    return render_template("dashboard.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        
        db = SessionLocal()
        user = db.query(User).filter(User.email == email).first()
        if user and user.password_hash and check_password_hash(user.password_hash, password):
            user.last_login_at = datetime.utcnow()
            db.commit()
            login_user(user)
            db.close()
            return redirect(url_for('dashboard'))
        db.close()
        flash("Invalid email or password", "error")
        
    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == "POST":
        full_name = request.form.get("full_name")
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")
        
        db = SessionLocal()
        if db.query(User).filter(User.email == email).first() or db.query(User).filter(User.username == username).first():
            flash("Email or Username already exists", "error")
        else:
            new_user = User(
                full_name=full_name,
                username=username,
                email=email,
                password_hash=generate_password_hash(password),
                auth_provider="local"
            )
            db.add(new_user)
            db.commit()
            login_user(new_user)
            db.close()
            return redirect(url_for('dashboard'))
        db.close()
    return render_template("register.html")

@app.route('/auth/google')
def auth_google():
    redirect_uri = url_for('auth_google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/auth/google/callback')
def auth_google_callback():
    try:
        token = google.authorize_access_token()
        userinfo = token.get('userinfo')
        if not userinfo:
            userinfo = google.userinfo()
    except Exception as e:
        flash("Google authentication failed or was cancelled.", "error")
        return redirect(url_for('login'))
        
    email = userinfo.get("email")
    email_verified = userinfo.get("email_verified", False)
    
    if not email_verified:
        flash("Google could not provide a verified email address for this account.", "error")
        return redirect(url_for('login'))
        
    google_sub = userinfo.get("sub")
    full_name = userinfo.get("name")
    profile_picture = userinfo.get("picture")
    
    db = SessionLocal()
    user = db.query(User).filter(User.google_sub == google_sub).first()
    
    if not user:
        # Check if email exists
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Link accounts safely
            user.google_sub = google_sub
            if not user.profile_picture:
                user.profile_picture = profile_picture
            user.auth_provider = "google"
        else:
            # Create new Google user
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
                
            user = User(
                full_name=full_name,
                username=username,
                email=email,
                google_sub=google_sub,
                profile_picture=profile_picture,
                auth_provider="google",
                email_verified=True
            )
            db.add(user)
    
    user.last_login_at = datetime.utcnow()
    db.commit()
    login_user(user)
    db.close()
    
    return redirect(url_for('dashboard'))

@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been signed out.", "info")
    return redirect(url_for('login'))

@app.route("/profile")
@login_required
def profile():
    return render_template("profile.html")


@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

from flask import send_from_directory

@app.route('/data/<path:filename>')
def serve_data(filename):
    return send_from_directory('static/data', filename)

@app.route('/watersight-logo.png')
def serve_logo():
    return send_from_directory('static', 'watersight-logo.png')

@app.context_processor
def inject_google_config():
    is_conf = bool(os.environ.get('GOOGLE_CLIENT_ID') and os.environ.get('GOOGLE_CLIENT_SECRET')) and os.environ.get('GOOGLE_CLIENT_ID') != 'test_id'
    print("INJECT GOOGLE CONFIG CALLED! RESULT:", is_conf)
    return {'google_configured': is_conf}


import uuid
from flask import send_from_directory
import json
from backend.models import FieldEvidence

app.config['EVIDENCE_FOLDER'] = os.path.join(app.root_path, 'data', 'evidence', 'uploads')
os.makedirs(app.config['EVIDENCE_FOLDER'], exist_ok=True)

@app.route('/api/evidence', methods=['POST'])
# @login_required # If you want to require login
def upload_evidence_post():
    if not current_user.is_authenticated:
        return jsonify({'message': 'Please log in to upload field evidence.'}), 401

    if 'file' not in request.files:
        return jsonify({'message': 'No file part', 'error_code': 'MISSING_FILE'}), 400
    
    file = request.files['file']
    category = request.form.get('category', 'General')
    description = request.form.get('description', '')
    
    if file.filename == '':
        return jsonify({'message': 'No selected file', 'error_code': 'EMPTY_FILE'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({
            'status': 'error', 
            'error_code': 'INVALID_FILE_TYPE',
            'message': 'Only JPG, JPEG, PNG and WEBP images are supported.'
        }), 400

    evidence_id = str(uuid.uuid4())
    original_filename = secure_filename(file.filename)
    name, ext = os.path.splitext(original_filename)
    stored_filename = f"{evidence_id}{ext.lower()}"
    filepath = os.path.join(app.config['EVIDENCE_FOLDER'], stored_filename)
    
    file.save(filepath)
    file_size = os.path.getsize(filepath)
    mime_type = file.mimetype
    
    # Process EXIF
    gps_data = extract_gps_data(filepath)
    
    manual_lat = request.form.get('latitude')
    manual_lng = request.form.get('longitude')
    
    lat = None
    lng = None
    gps_source = 'unavailable'
    
    if manual_lat and manual_lng:
        try:
            lat = float(manual_lat)
            lng = float(manual_lng)
            gps_source = request.form.get('gps_source', 'manual')
        except:
            pass
    elif 'error' not in gps_data and 'latitude' in gps_data and 'longitude' in gps_data:
        lat = gps_data['latitude']
        lng = gps_data['longitude']
        gps_source = 'EXIF'
    else:
        try:
            os.remove(filepath)
        except:
            pass
        return jsonify({'message': 'GPS metadata not found.', 'error_code': 'MISSING_GPS'}), 400
        
    # Save to database
    session_db = sessionmaker(bind=engine)()
    acc = request.form.get('accuracy_m')
    if acc:
        try:
            acc = float(acc)
        except:
            acc = None
    else:
        acc = None
        
    new_evidence = FieldEvidence(
        id=evidence_id,
        user_id=current_user.id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        category=category,
        description=description,
        file_path=filepath,
        mime_type=mime_type,
        file_size=file_size,
        latitude=lat,
        longitude=lng,
        gps_source=gps_source,
        accuracy_m=acc,
        exif_json=json.dumps(gps_data) if 'error' not in gps_data else None
    )
    session_db.add(new_evidence)
    session_db.commit()
    session_db.close()
    
    response_payload = {
        "status": "success",
        "evidence": {
            "id": evidence_id,
            "original_filename": original_filename,
            "category": category,
            "description": description,
            "latitude": lat,
            "longitude": lng,
            "gps_source": gps_source,
            "uploaded_at": datetime.utcnow().isoformat(),
            "image_url": f"/api/evidence/{evidence_id}/image"
        }
    }
    
    if gps_source == 'unavailable':
        response_payload["message"] = "Image uploaded successfully, but no GPS coordinates were found in EXIF metadata."
        
    return jsonify(response_payload), 201

@app.route('/api/evidence/<evidence_id>/image', methods=['GET'])
def get_evidence_image(evidence_id):
    session_db = sessionmaker(bind=engine)()
    evidence = session_db.query(FieldEvidence).filter(FieldEvidence.id == evidence_id).first()
    session_db.close()
    if not evidence:
        return jsonify({'message': 'Evidence not found'}), 404
    return send_from_directory(app.config['EVIDENCE_FOLDER'], evidence.stored_filename)

@app.route('/api/evidence/<evidence_id>/location', methods=['PATCH'])
def update_evidence_location(evidence_id):
    if not current_user.is_authenticated:
        return jsonify({'message': 'Please log in.'}), 401
        
    data = request.json
    if not data:
        return jsonify({'message': 'Invalid JSON data'}), 400
        
    lat = data.get('latitude')
    lng = data.get('longitude')
    gps_source = data.get('gps_source')
    
    if lat is None or lng is None:
        return jsonify({'message': 'Latitude and longitude are required'}), 400
        
    try:
        lat = float(lat)
        lng = float(lng)
    except (ValueError, TypeError):
        return jsonify({'message': 'Latitude and longitude must be numbers'}), 400
        
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        return jsonify({'message': 'Invalid coordinates range'}), 400
        
    session_db = sessionmaker(bind=engine)()
    evidence = session_db.query(FieldEvidence).filter(FieldEvidence.id == evidence_id).first()
    
    if not evidence:
        session_db.close()
        return jsonify({'message': 'Evidence not found'}), 404
        
    # Security: only owner can update
    if evidence.user_id != current_user.id:
        session_db.close()
        return jsonify({'message': 'Unauthorized'}), 403
        
    evidence.latitude = lat
    evidence.longitude = lng
    evidence.gps_source = gps_source
    
    # Optional fields
    if 'accuracy_m' in data and data['accuracy_m'] is not None:
        evidence.accuracy_m = float(data['accuracy_m'])
    if 'altitude_m' in data and data['altitude_m'] is not None:
        evidence.altitude_m = float(data['altitude_m'])
    if 'heading_deg' in data and data['heading_deg'] is not None:
        evidence.heading_deg = float(data['heading_deg'])
    if 'speed_mps' in data and data['speed_mps'] is not None:
        evidence.speed_mps = float(data['speed_mps'])
        
    session_db.commit()
    
    response_payload = {
        "status": "success",
        "evidence": {
            "id": evidence.id,
            "latitude": evidence.latitude,
            "longitude": evidence.longitude,
            "gps_source": evidence.gps_source,
            "accuracy_m": evidence.accuracy_m
        }
    }
    session_db.close()
    
    return jsonify(response_payload), 200

@app.route('/api/evidence', methods=['GET'])
def get_all_evidence():
    session_db = sessionmaker(bind=engine)()
    evidences = session_db.query(FieldEvidence).all()
    session_db.close()
    
    features = []
    for ev in evidences:
        if ev.latitude is not None and ev.longitude is not None:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [ev.longitude, ev.latitude]
                },
                "properties": {
                    "id": ev.id,
                    "category": ev.category,
                    "description": ev.description,
                    "original_filename": ev.original_filename,
                    "uploaded_at": ev.uploaded_at.isoformat() if ev.uploaded_at else "",
                    "gps_source": ev.gps_source,
                    "image_url": f"/api/evidence/{ev.id}/image",
                    "user_id": ev.user_id,
                    "accuracy_m": ev.accuracy_m,
                    "source": "Watersight field evidence"
                }
            })
            
    return jsonify({
        "type": "FeatureCollection",
        "features": features,
        "total": len(evidences)
    })

@app.route('/satellite-analysis')
@login_required
def satellite_analysis():
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    img = request.args.get('img')
    # State and District logic can be mocked for now in Python before rendering
    # Milestone 1: We will mock it, or implement a basic reverse geocoding
    state = "Mock State"
    district = "Mock District"
    watershed = "Mock Watershed"
    return render_template('satellite_analysis.html', lat=lat, lng=lng, img=img, state=state, district=district, watershed=watershed)


from satellite_service import search_satellite_scenes

@app.route('/api/satellite/search', methods=['POST'])
@login_required
def api_satellite_search():
    data = request.json
    lat = float(data.get('lat', 23.2))
    lon = float(data.get('lng', 87.5))
    start_date = data.get('start_date', '2023-01-01')
    end_date = data.get('end_date', '2023-01-31')
    cloud_cover = int(data.get('cloud_cover', 20))
    
    scenes = search_satellite_scenes(lat, lon, start_date, end_date, cloud_cover)
    return jsonify(scenes)

if __name__ == '__main__':
    app.run(debug=True, port=5000)


