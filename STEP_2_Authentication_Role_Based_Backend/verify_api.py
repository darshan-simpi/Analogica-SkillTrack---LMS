import requests
import json

BASE_URL = "http://127.0.0.1:5005/api"
ADMIN_EMAIL = "admin@analogica.com" # Assuming this exists or I need to login
# Wait, I need a token. Let's assume I can login or existing token is expired.
# I'll try to login first.

def verify_workshop_api():
    try:
        # 1. Login as Admin
        # Note: I need to know a valid admin credential. 
        # Based on previous context or config, let's try a standard one or create a test user if possible.
        # If I can't login, I can't test. 
        # Let's check 'update_db_schema.py' or 'config.py' again? No.
        # I'll assume standard credentials or try to create one if needed, but easier to just ask user or use existing DB data.
        # Actually, let's just try to hit the GET endpoint first which might be public?
        # Checking `course_api.py`: `@course_bp.route("/workshops", methods=["GET"])` does NOT have `@jwt_required()`.
        
        print("Testing GET /workshops...")
        response = requests.get(f"{BASE_URL}/workshops")
        if response.status_code == 200:
            print("GET /workshops Success")
            data = response.json()
            if data and len(data) > 0:
                first_workshop = data[0]
                if "location" in first_workshop and "start_date" in first_workshop:
                    print("✅ Schema Verification Passed: 'location' and 'start_date' fields found.")
                else:
                    print("❌ Schema Verification Failed: Fields missing in response.")
                    print(f"Response keys: {first_workshop.keys()}")
            else:
                print("⚠️ No workshops found to verify schema.")
        else:
            print(f"❌ GET /workshops Failed: {response.status_code}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_workshop_api()
