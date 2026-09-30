from PIL import Image, ExifTags

def convert_to_degrees(value):
    d = float(value[0])
    m = float(value[1])
    s = float(value[2])
    return d + (m / 60.0) + (s / 3600.0)

def extract_gps_data(filepath):
    try:
        img = Image.open(filepath)
        exif = img._getexif()
        if not exif:
            return {"error": "No EXIF metadata found."}

        gps_info = {}
        for key, val in exif.items():
            decoded = ExifTags.TAGS.get(key, key)
            if decoded == 'GPSInfo':
                for t in val:
                    sub_decoded = ExifTags.GPSTAGS.get(t, t)
                    gps_info[sub_decoded] = val[t]
        
        if not gps_info:
            return {"error": "No GPS metadata found in EXIF."}
            
        lat_data = gps_info.get('GPSLatitude')
        lat_ref = gps_info.get('GPSLatitudeRef')
        lon_data = gps_info.get('GPSLongitude')
        lon_ref = gps_info.get('GPSLongitudeRef')
        
        if lat_data and lat_ref and lon_data and lon_ref:
            lat = convert_to_degrees(lat_data)
            if lat_ref != 'N':
                lat = -lat
                
            lon = convert_to_degrees(lon_data)
            if lon_ref != 'E':
                lon = -lon
                
            return {
                "latitude": round(lat, 6),
                "longitude": round(lon, 6),
                "altitude": gps_info.get('GPSAltitude'),
                "date_taken": gps_info.get('GPSDateStamp')
            }
        else:
            return {"error": "Incomplete GPS metadata."}
            
    except Exception as e:
        return {"error": str(e)}
