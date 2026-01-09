from models import Course, Enrollment, User
from extensions import db
from app import app

def check():
    with app.app_context():
        courses = Course.query.all()
        enrollments = Enrollment.query.all()
        students = User.query.filter_by(role='STUDENT').all()
        
        print("Courses:")
        for c in courses:
            print(f"  ID: {c.id}, Name: {c.name}, Duration: {c.duration}, Start: {c.start_date}")
            
        print("\nEnrollments:")
        for e in enrollments:
            print(f"  Student ID: {e.user_id}, Course ID: {e.course_id}")
            
        print("\nStudents:")
        for u in students:
            print(f"  ID: {u.id}, Name: {u.name}")

if __name__ == "__main__":
    check()
