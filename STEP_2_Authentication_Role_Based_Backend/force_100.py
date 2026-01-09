from models import User, Course, Assignment, Submission, StudentProgress, Enrollment
from extensions import db
from app import app
from datetime import datetime
from student_api import get_required_assignments

def force_100(student_id, course_id):
    with app.app_context():
        course = Course.query.get(course_id)
        if not course: return
             
        required = get_required_assignments(course.duration)
        print(f"Goal: Submit {required} assignments for Course {course_id}")

        for i in range(1, required + 1):
            # Find or create assignment for this week
            a = Assignment.query.filter_by(course_id=course_id, week_number=i).first()
            if not a:
                a = Assignment(
                    course_id=course_id,
                    title=f"Automated Assignment Week {i}",
                    week_number=i,
                    due_date="2026-01-01",
                    is_released=True
                )
                db.session.add(a)
                db.session.flush() # Get ID without full commit yet
            
            # Submissions for this assignment
            s = Submission.query.filter_by(student_id=student_id, assignment_id=a.id).first()
            if not s:
                s = Submission(
                    student_id=student_id,
                    assignment_id=a.id,
                    file_path="uploads/test_file.txt",
                    submitted_at=datetime.utcnow()
                )
                db.session.add(s)
        
        # Also update StudentProgress table explicitly to be safe
        prog = StudentProgress.query.filter_by(user_id=student_id, course_id=course_id).first()
        if prog:
            prog.assignments_completed = required
            prog.total_assignments = required
            prog.progress = 100
            prog.status = "Completed"
        
        db.session.commit()
        print(f"✅ SUCCESS: Student {student_id} now has 100% in Course {course_id}")

if __name__ == "__main__":
    force_100(4, 1)
