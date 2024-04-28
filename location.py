import geocoder
from geopy.geocoders import GoogleV3

def get_address(latitude, longitude, api_key):
    geolocator = GoogleV3(api_key=api_key)
    location = geolocator.reverse((latitude, longitude), exactly_one=True)
    if location:
        return location.address
    else:
        return None

# Get the current location's coordinates
def get_current_location():
    g = geocoder.ip('me')
    if g:
        return (g.latlng[0], g.latlng[1])
    else:
        return None

# Insert  Google Maps API key.
api_key = "AIzaSyBd-FH25TkhKTYJYEaK0y0_opAPifuK4ZI"

# Get current location coordinates
coordinates = get_current_location()

if coordinates:
    latitude, longitude = coordinates
    print(f"Device coordinates: Latitude = {latitude}, Longitude = {longitude}")
    
    # Get address using the coordinates
    address = get_address(latitude, longitude, api_key)
    if address:
        print(f"The address of the device's location is: {address}")
    else:
        print("Couldn't find the address for the provided coordinates.")
else:
    print("Couldn't retrieve device coordinates.")
