from models import User, Course, Assignment, Submission, StudentProgress, Enrollment
from extensions import db
from app import app
from datetime import datetime

def check_state():
    with app.app_context():
        print("--- STUDENTS ---")
        students = User.query.filter_by(role="STUDENT").all()
        for s in students:
            print(f"ID: {s.id}, Name: {s.name}, Email: {s.email}")
            
        print("\n--- COURSES ---")
        courses = Course.query.all()
        for c in courses:
            print(f"ID: {c.id}, Name: {c.name}, Duration: {c.duration}")
            
        print("\n--- ENROLLMENTS & PROGRESS ---")
        progress = StudentProgress.query.all()
        for p in progress:
            print(f"Student: {p.user_id}, Course: {p.course_id}, Progress: {p.progress}%, Status: {p.status}")

        print("\n--- ASSIGNMENTS ---")
        assignments = Assignment.query.order_by(Assignment.course_id, Assignment.week_number).all()
        for a in assignments:
            print(f"ID: {a.id}, Course: {a.course_id}, Week: {a.week_number}, Title: {a.title}, Due: {a.due_date}")
            
        print("\n--- SUBMISSIONS ---")
        submissions = Submission.query.all()
        for s in submissions:
            print(f"ID: {s.id}, Student: {s.student_id}, Assignment: {s.assignment_id}, At: {s.submitted_at}")

if __name__ == "__main__":
    check_state()
