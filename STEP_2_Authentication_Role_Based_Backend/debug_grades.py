from app import create_app
from extensions import db
from models import User, Submission
import sys

# Redirect output to file
with open("debug_output.txt", "w", encoding="utf-8") as f:
    sys.stdout = f
    
    app = create_app()

    with app.app_context():
        print("--- DEBUGGING GRADES ---")
        users = User.query.filter_by(role="STUDENT").all()
        for user in users:
            print(f"\nStudent: {user.name} (ID: {user.id})")
            submissions = Submission.query.filter_by(student_id=user.id).all()
            if not submissions:
                print("  No submissions found.")
                continue
                
            print(f"  Found {len(submissions)} submissions.")
            valid_grades = []
            for s in submissions:
                print(f"  - Assignment {s.assignment_id}: Grade='{s.grade}' (Type: {type(s.grade)})")
                
                if s.grade:
                    try:
                        clean = s.grade.replace('%', '').strip()
                        val = float(clean)
                        valid_grades.append(val)
                        print(f"    -> Parsed as: {val}")
                    except ValueError:
                        print(f"    -> Failed to parse '{s.grade}' as float")
                else:
                    print("    -> Grade is None or Empty")

            if valid_grades:
                avg = int(sum(valid_grades) / len(valid_grades))
                print(f"  CALCULATED AVERAGE: {avg}%")
            else:
                print("  CALCULATED AVERAGE: N/A")
