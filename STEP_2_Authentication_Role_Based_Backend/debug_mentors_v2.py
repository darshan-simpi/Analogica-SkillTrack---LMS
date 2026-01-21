from app import app, db
from models import User, Course, StudentProgress, Enrollment

def debug_mentors():
    with app.app_context():
        print("DEBUG_START")
        
        # 1. List All Trainers
        trainers = User.query.filter_by(role="TRAINER").all()
        print(f"Trainers: {len(trainers)}")
        for t in trainers:
            print(f"Trainer: {t.name} (ID: {t.id})")

        # 2. List All Courses
        courses = Course.query.all()
        print(f"Courses: {len(courses)}")
        for c in courses:
            print(f"Course: {c.name} (ID: {c.id}) | Mentor: {c.mentor_name}")

        # 3. Check Students
        students = User.query.filter_by(role="STUDENT").all()
        print(f"Students: {len(students)}")
        
        for s in students:
            print(f"Student: {s.name} (ID: {s.id})")
            
            # Check Enrollment Table
            enrollments = Enrollment.query.filter_by(user_id=s.id).all()
            print(f"  Enrollments (Table): {len(enrollments)}")
            for e in enrollments:
                print(f"    - CourseID: {e.course_id}, InternshipID: {e.internship_id}")
                
            # Check StudentProgress Table
            progress = StudentProgress.query.filter_by(user_id=s.id).all()
            print(f"  StudentProgress (Table): {len(progress)}")
            for p in progress:
                print(f"    - CourseID: {p.course_id}")
                
        print("DEBUG_END")

if __name__ == "__main__":
    debug_mentors()
