from models import Assignment, Submission
from extensions import db
from app import app

def check():
    with app.app_context():
        assignments = Assignment.query.all()
        submissions = Submission.query.all()
        
        print(f"Total Assignments: {len(assignments)}")
        for a in assignments:
            print(f"  ID: {a.id}, Course: {a.course_id}, Week: {a.week_number}, Title: {a.title}")
            
        print(f"\nTotal Submissions: {len(submissions)}")
        for s in submissions:
            print(f"  ID: {s.id}, Student: {s.student_id}, Assignment: {s.assignment_id}")

if __name__ == "__main__":
    check()
