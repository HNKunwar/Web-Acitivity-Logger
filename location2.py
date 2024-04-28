from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/get_location', methods=['GET'])
def get_location():
    if 'latitude' in request.args and 'longitude' in request.args:
        latitude = request.args['latitude']
        longitude = request.args['longitude']
        # Process the obtained latitude and longitude here
        return jsonify({'latitude': latitude, 'longitude': longitude})
    else:
        return jsonify({'error': 'Latitude and longitude parameters are required'}), 400

if __name__ == '__main__':
    app.run(debug=True)
