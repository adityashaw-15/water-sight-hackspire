# 🌍 WaterSight: Geospatial Intelligence for Watershed Development

**🚀 Live Demo:** [https://water-sight.onrender.com](https://water-sight.onrender.com)

WaterSight is a geospatial platform for visualization and analysis of geo-coded images to support watershed development and monitoring. It seamlessly integrates field-level evidence with satellite data and artificial intelligence to ensure accurate environmental monitoring.

## Team
HACKSPIRE:-BBDROID

## Project
Watershed monitoring using GIS, remote sensing, satellite data and geo-coded field images.

## ✨ Key Features
* **🗺️ Interactive GIS Dashboard:** A dynamic, React-Leaflet powered map displaying critical zones, drainage networks, micro-watersheds, and live project monitoring data.
* **📸 Geo-Coded Field Evidence:** Users can upload on-site photography with embedded GPS coordinates to track physical interventions.
* **🧠 Real-Time AI Image Validation:** Built-in AI automatically intercepts evidence uploads, analyzing the pixels to reject invalid submissions (like screenshots or selfies).
* **🛰️ Satellite Spectral Analysis:** Integrates with remote sensing tools to perform on-demand spectral analysis (NDVI, NDWI).
* **⚠️ Disaster & Risk Alerts:** Aggregates and displays live environmental risk alerts from official sources.

## 🛠️ Tech Stack
- **Frontend:** React / HTML / CSS / JS (Modern Floating Pill UI)
- **Backend:** Python Flask
- **Artificial Intelligence:** PyTorch, TorchVision (Image Classification)
- **GIS:** GeoPandas, Rasterio, Shapely, React-Leaflet
- **Database:** PostgreSQL + PostGIS (SQLAlchemy)

## Google Authentication Setup
This application supports real Google OAuth 2.0 / OpenID Connect login.

1. Create a Google Cloud project at [Google Cloud Console](https://console.cloud.google.com).
2. Configure the OAuth Consent screen.
3. Create Credentials -> OAuth client ID (Web application).
4. Add authorized redirect URIs. For local development on Flask default port, use:
   `http://localhost:5000/auth/google/callback` and `http://127.0.0.1:5000/auth/google/callback`
   *(If deploying to production, replace with `https://water-sight.onrender.com/auth/google/callback`)*
5. Copy the generated **Client ID** and **Client Secret**.
6. Fill in the values in your `.env` file:
   ```env
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   FLASK_SECRET_KEY=generate-a-secure-random-string
   ```
7. Start the Flask application: `python app.py`
8. Open `http://localhost:5000/login` to authenticate!
