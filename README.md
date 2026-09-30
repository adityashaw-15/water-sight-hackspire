# Watersight

Geospatial platform for visualization and analysis of geo-coded images
to support watershed development and monitoring.

## Team
HACKSPIRE:-BBDROID

## Project
Watershed monitoring using GIS, remote sensing,
satellite data and geo-coded field images.

## Tech Stack
- Frontend: React / HTML / CSS / JS
- Backend: API Python Flask
- GIS: GIS PROCESSING GeoPandas Rasterio Shapely
- Database: PostgreSQL + PostGIS
    


## Google Authentication Setup
This application supports real Google OAuth 2.0 / OpenID Connect login.

1. Create a Google Cloud project at [Google Cloud Console](https://console.cloud.google.com).
2. Configure the OAuth Consent screen (User Type: External/Internal).
3. Create Credentials -> OAuth client ID (Web application).
4. Add authorized redirect URIs. For local development on Flask default port, use:
   http://localhost:5000/auth/google/callback
   *(If deploying to production, replace with https://your-domain.com/auth/google/callback)*
5. Copy the generated **Client ID** and **Client Secret**.
6. Copy .env.example to .env and fill in the values:
   `env
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   SECRET_KEY=generate-a-secure-random-string
   `
7. Start the Flask application: python app.py
8. Open http://localhost:5000/login to authenticate!
