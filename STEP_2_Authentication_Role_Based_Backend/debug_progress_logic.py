
from flask import Flask
from config import Config
from extensions import db
from models import User, Enrollment, Course, Assignment, Submission, StudentProgress, Quiz, QuizSubmission, Certificate
from student_api import student_bp, student_progress, get_required_assignments

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

def test_progress_logic():
    with app.app_context():
        # Find Hima
        users = User.query.all()
        student = None
        for u in users:
             if "hima" in u.name.lower():
                 student = u
                 break
        if not student: student = User.query.filter_by(role="STUDENT").first()
        
        print(f"Testing for Student: {student.name} ({student.id})")
        
        # MOCKING get_jwt_identity
        # We can't easily mock jwt decorator, but we can call the logic inside if we extract it, 
        # or we just copy-paste the logic here to verify independent of flask-jwt.
        
        # Method 1: Re-implement logic exactly as in the file to see what it produces
        enroll_ids = {e.course_id for e in Enrollment.query.filter_by(user_id=student.id).all()}
        prog_ids = {p.course_id for p in StudentProgress.query.filter_by(user_id=student.id).all()}
        all_course_ids = enroll_ids.union(prog_ids)
        
        print(f"Courses Found: {all_course_ids}")
        
        for cid in all_course_ids:
            course = Course.query.get(cid)
            if not course: continue
            
            print(f"\nCourse: {course.name}")
            print(f"  DB Duration: '{course.duration}'")
            
            # Quizzes
            q_ids = {q.id for q in Quiz.query.filter_by(course_id=course.id).all()}
            print(f"  Quiz IDs: {q_ids}")
            
            # Req
            req = get_required_assignments(course.duration)
            print(f"  Req count: {req}")
            
            # Logic check from file
            if not req or not isinstance(req, int) or req <= 0: req = 4
            
            total_quizzes = len(q_ids) if len(q_ids) > 0 else req
            
            raw_dur = str(course.duration) if (course.duration and str(course.duration).strip()) else "1 Month"
            
            print(f"  --> CALCULATED Duration: {raw_dur}")
            print(f"  --> CALCULATED Total Quizzes: {total_quizzes}")

if __name__ == "__main__":
    test_progress_logic()
