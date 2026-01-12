from app import create_app
from extensions import db
from models import User, Submission, Assignment, Course, Enrollment, StudentProgress
from flask_jwt_extended import create_access_token
import sys

# Redirect output to file
with open("verify_grade_output.txt", "w", encoding="utf-8") as f:
    sys.stdout = f
    
    app = create_app()
    app.config["TESTING"] = True
    
    with app.app_context():
        print("--- VERIFYING GRADE FLOW ---")
        
        # 1. Setup Data
        student = User.query.filter_by(role="STUDENT").first()
        trainer = User.query.filter_by(role="TRAINER").first()
        
        if not student or not trainer:
            print("ERROR: Missing student or trainer.")
            exit()
            
        print(f"Student: {student.name} (ID: {student.id})")
        print(f"Trainer: {trainer.name} (ID: {trainer.id})")
        
        # Find or create a submission
        sub = Submission.query.filter_by(student_id=student.id).first()
        if not sub:
            print("Creating dummy submission...")
            # Ensure course/assignment exists (skipping for brevity, assuming existing)
            # This might file if DB is empty, but debug_grades.py showed submissions.
            print("ERROR: No submissions found for student.")
            exit()
            
        print(f"Target Submission ID: {sub.id} (Current Grade: {sub.grade})")
        
        # 2. Simulate Trainer updating Grade via API
        with app.test_client() as client:
            trainer_token = create_access_token(identity=str(trainer.id)) # Use string ID for JWT
            
            print(f"\n[Step 1] Updating Grade to '95' via API...")
            res = client.post(
                "/api/trainer/submission/update",
                json={"submission_id": sub.id, "grade": "95"},
                headers={"Authorization": f"Bearer {trainer_token}"}
            )
            print(f"Response: {res.status_code} - {res.get_json()}")
            
            # Verify DB immediately
            db.session.refresh(sub)
            print(f"DB Check after update: Grade = '{sub.grade}' (Should be '95')")
            
            if sub.grade != "95":
                print("FAIL: Grade did not update in DB!")
                
            
            # 3. Simulate Student checking Dashboard
            print(f"\n[Step 2] Student checking Dashboard...")
            student_token = create_access_token(identity=str(student.id))
            
            res = client.get(
                "/api/student/dashboard",
                headers={"Authorization": f"Bearer {student_token}"}
            )
            
            if res.status_code == 200:
                data = res.get_json()
                print(f"Dashboard Response: Overall Grade = {data.get('overall_grade')}")
                if data.get('overall_grade') == "95%":
                    print("SUCCESS: Grade logic is working correctly.")
                else:
                    print("FAIL: Overall grade mismatch.")
            else:
                 print(f"FAIL: Dashboard API returned {res.status_code}")
