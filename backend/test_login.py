import requests
import json

response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "loadtest@fumorive.com", "password": "LoadTest123!"}
)

print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
