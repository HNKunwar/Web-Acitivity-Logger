from flask import Flask, request, jsonify, g
from flask_cors import CORS
import sqlite3
import datetime
import geoip2.database
from geopy.geocoders import Nominatim
from geopy.geocoders import GoogleV3
import os

app = Flask(__name__)
CORS(app)

geolocator = Nominatim(user_agent='geoapiExercises')  # This line is necessary
active_class = None
active_address = None

api_key = os.environ.get("GOOGLE_MAPS_API_KEY")

# Function to get the address from the coordinates
def get_address(latitude, longitude):
    try:
        geolocator = GoogleV3(api_key=api_key)
        location = geolocator.reverse((latitude, longitude), exactly_one=True)
        if location:
            return location.address
    except Exception as e:
        print(f"Error getting address: {str(e)}")
    return None

def create_db():
    # Create the visit_data table if it doesn't exist.
    conn = sqlite3.connect('visit_data.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS visit_data
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                 url TEXT,
                 timestamp TEXT,
                 latitude REAL,
                 longitude REAL,
                 subject TEXT,
                 address TEXT,
                 nickname TEXT)''')
    conn.commit()
    conn.close()

@app.before_request
def before_request():
    g.db = sqlite3.connect('visit_data.db', check_same_thread=False)
    g.db.row_factory = sqlite3.Row
    g.cursor = g.db.cursor()

    if not hasattr(g, 'db_created'):
        create_db()
        g.db_created = True

    if not hasattr(g, 'geoip_reader'):
        g.geoip_reader = geoip2.database.Reader('./GeoLite2-City.mmdb')  # Path to the GeoLite2-City.mmdb file

@app.after_request
def after_request(response):
    g.db.close()
    return response


@app.route('/toggle_class', methods=['POST'])
def toggle_class():
    global active_class
    data = request.get_json()
    if data['active']:
        active_class = data['class_name']
    else:
        active_class = None
    return jsonify({'success': True, 'active_class': active_class})

@app.route('/log_visit', methods=['POST'])
def log_visit():
    data = request.get_json()
    print('Received visit data:', data)
    # Process the visit data
    url = data['url']
    timestamp = datetime.datetime.now().isoformat()
    # Directly use the 'geolocation' data sent by the client, if available
    geolocation_data = data.get('geolocation')
    latitude = geolocation_data.get('latitude') if geolocation_data else None
    longitude = geolocation_data.get('longitude') if geolocation_data else None
    # Get the address from the coordinates
    address = get_address(latitude, longitude) if (latitude and longitude) else None

    print(f"The address of the location is: {address}")
    global active_class
    subject = active_class if active_class is not None else 'Unknown'
    print(f"Active class: {subject}")

    # Check if we have valid geolocation data
    if latitude is not None and longitude is not None:
        g.cursor.execute("INSERT INTO visit_data (url, timestamp, latitude, longitude, subject, address) VALUES (?, ?, ?, ?, ?, ?)",
                         (url, timestamp, latitude, longitude, subject, address))
        g.db.commit()
        response_data = {
            'action': 'allow', #Built for interaction with Extension - not fully implemented
            'address': address
        }
    else:
        response_data = {
            'error': 'Missing geolocation data'
        }
    return jsonify(response_data)



@app.route('/active_address', methods=['POST'])
def new_address():
    global active_address
    print(f"Active address flask: {active_address}")
    return jsonify({'address': active_address})

@app.route('/get_visit_data', methods=['GET'])
def get_visit_data():
    g.cursor.execute("SELECT * FROM visit_data")
    visit_data = g.cursor.fetchall()
    return jsonify([{'id': row['id'], 'url': row['url'], 'timestamp': row['timestamp'], 'latitude': row['latitude'], 'longitude': row['longitude'], 'subject': row['subject'], 'address': row['address'], 'nickname': row['nickname']} for row in visit_data])

@app.route('/update_nickname', methods=['POST'])
def update_nickname():
    data = request.get_json()
    address = data['address']
    new_nickname = data['new_nickname']

    g.cursor.execute("UPDATE visit_data SET nickname = ? WHERE address = ?", (new_nickname, address))
    g.db.commit()

    return jsonify({'success': True})

@app.route('/get_location', methods=['POST'])
def get_location():
    location_data = request.get_json()
    latitude = location_data['latitude']
    longitude = location_data['longitude']
    location = geolocator.reverse((latitude, longitude), exactly_one=True)
    return jsonify({'address': location.address})

if __name__ == '__main__':
    app.run(port=4999)