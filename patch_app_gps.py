with open('app.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
old_logic = r'''    elif 'error' not in gps_data and 'latitude' in gps_data and 'longitude' in gps_data:
        lat = gps_data\['latitude'\]
        lng = gps_data\['longitude'\]
        gps_source = 'EXIF'

    # Save to database'''

new_logic = '''    elif 'error' not in gps_data and 'latitude' in gps_data and 'longitude' in gps_data:
        lat = gps_data['latitude']
        lng = gps_data['longitude']
        gps_source = 'EXIF'
    else:
        # Neither manual coords passed, nor EXIF found.
        try:
            os.remove(filepath)
        except:
            pass
        return jsonify({'message': 'GPS metadata not found.', 'error_code': 'MISSING_GPS'}), 400

    # Save to database'''

text = re.sub(old_logic, new_logic, text)
with open('app.py', 'w', encoding='utf-8') as f:
    f.write(text)
