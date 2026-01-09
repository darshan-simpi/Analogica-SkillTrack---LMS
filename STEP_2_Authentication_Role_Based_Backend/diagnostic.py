from models import User, Course, Assignment, Submission, StudentProgress, Enrollment
from extensions import db
from app import app
from student_api import get_required_assignments

def diagnostic(student_id, course_id):
    with app.app_context():
        course = Course.query.get(course_id)
        if not course:
             print("Course not found")
             return
             
        required = get_required_assignments(course.duration)
        submissions = Submission.query.filter_by(student_id=student_id).all()
        course_assignments = Assignment.query.filter_by(course_id=course_id).all()
        course_asgn_ids = {a.id for a in course_assignments}
        
        submitted_for_course = [s.assignment_id for s in submissions if s.assignment_id in course_asgn_ids]
        unique_submitted = len(set(submitted_for_course))
        
        print(f"Course: {course.name} (Duration: {course.duration})")
        print(f"Required Assignments: {required}")
        print(f"Assignments in DB for this course: {len(course_assignments)}")
        print(f"Student Submissions for this course: {unique_submitted}")
        
        if unique_submitted >= required:
            print("✅ Eligibility Check: PASSED")
        else:
            print(f"❌ Eligibility Check: FAILED ({unique_submitted}/{required})")

        # Check existing certificate record
        cert = Certificate.query.filter_by(user_id=student_id, course_id=course_id).first()
        if cert:
            print(f"Certificate URL in DB: {cert.certificate_url}")
        else:
            print("No certificate record in DB.")

if __name__ == "__main__":
    from models import Certificate # Ensure it's imported
    diagnostic(4, 1)
