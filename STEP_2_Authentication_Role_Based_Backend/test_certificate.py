from student_api import student_progress, generate_certificate
from models import User
from extensions import db
from app import app
from flask import json

def test_certificate_api(student_id, course_id):
    with app.app_context():
        # Setup request context for JWT
        from flask_jwt_extended import create_access_token
        access_token = create_access_token(identity=str(student_id))
        
        with app.test_client() as client:
            # 1. Check Progress first
            print("Checking progress via API...")
            res_p = client.get("/api/student/progress", headers={"Authorization": f"Bearer {access_token}"})
            print(f"Progress Status: {res_p.status_code}")
            print(res_p.get_json())

            # 2. Trigger Certificate Generation
            print("\nTriggering certificate generation...")
            res_c = client.post(f"/api/student/certificate/{course_id}", headers={"Authorization": f"Bearer {access_token}"})
            print(f"Certificate Status: {res_c.status_code}")
            data = res_c.get_json()
            print(data)
            
            if res_c.status_code in [200, 201]:
                url = data.get("url")
                full_path = f"certificates/{url.split('/')[-1]}"
                import os
                if os.path.exists(full_path):
                    print(f"✅ SUCCESS: Certificate file exists at {full_path}")
                else:
                    print(f"❌ ERROR: Certificate file NOT found at {full_path}")

if __name__ == "__main__":
    test_certificate_api(4, 1)
