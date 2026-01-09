from models import User, Course, Assignment, Submission, StudentProgress, Enrollment
from extensions import db
from app import app
from datetime import datetime
from student_api import get_required_assignments

def force_completion(student_id, course_id):
    with app.app_context():
        student = User.query.get(student_id)
        course = Course.query.get(course_id)
        
        if not student or not course:
            print("Student or Course not found")
            return

        required = get_required_assignments(course.duration)
        print(f"Force completing {required} assignments for {student.name} in {course.name}")

        for i in range(1, required + 1):
            # 1. Find or create assignment
            a = Assignment.query.filter_by(course_id=course_id, week_number=i).first()
            if not a:
                a = Assignment(
                    course_id=course_id,
                    title=f"Test Assignment {i}",
                    week_number=i,
                    due_date="2026-01-01",
                    is_released=True
                )
                db.session.add(a)
                db.session.commit()
            
            # 2. Check if already submitted
            existing = Submission.query.filter_by(student_id=student_id, assignment_id=a.id).first()
            if not existing:
                s = Submission(
                    student_id=student_id,
                    assignment_id=a.id,
                    file_path="uploads/test.txt",
                    submitted_at=datetime.utcnow()
                )
                db.session.add(s)
        
        db.session.commit()
        print("✅ All assignments submitted. Progress should be 100%.")

if __name__ == "__main__":
    force_completion(4, 1) # Student 4, Course 1
