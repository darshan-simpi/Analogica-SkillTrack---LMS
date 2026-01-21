
from flask import Flask
from config import Config
from extensions import db
from models import User, Course, Submission, Assignment, Quiz, QuizSubmission, Certificate
from student_api import generate_certificate_pdf, get_required_assignments
import os

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

def debug_cert():
    with app.app_context():
        print("--- Debugging Certificate Generation ---")
        
        # 1. Find Student 'Hima'
        users = User.query.all()
        student = None
        for u in users:
             if "hima" in u.name.lower() or "hima" in u.email.lower():
                 student = u
                 break
        
        if not student:
            print("Student Hima not found. Using first student.")
            student = User.query.filter_by(role="STUDENT").first()
            
        print(f"Student: {student.name} ({student.id})")

        # 2. Find Course
        # Assuming course_id 2 based on previous logs (cert_9_2.pdf)
        course = Course.query.get(2)
        if not course:
            print("Course 2 not found. Listing courses:")
            courses = Course.query.all()
            for c in courses: print(f" - {c.id}: {c.name}")
            return
            
        print(f"Course: {course.name} ({course.id})")
        
        # 3. Check Counters (Simulate 'generate_certificate' logic)
        submissions = Submission.query.filter_by(student_id=student.id).all()
        course_assignments = Assignment.query.filter_by(course_id=course.id).all()
        course_assignment_ids = {a.id for a in course_assignments}
        asgn_completed = len({s.assignment_id for s in submissions if s.assignment_id in course_assignment_ids})
        
        quiz_subs = QuizSubmission.query.filter_by(student_id=student.id).all()
        course_quizzes = Quiz.query.filter_by(course_id=course.id).all()
        course_quiz_ids = {q.id for q in course_quizzes}
        quiz_completed = len({s.quiz_id for s in quiz_subs if s.quiz_id in course_quiz_ids})
        
        required_count = get_required_assignments(course.duration)
        
        print(f"\n[Validation]")
        print(f"Required: {required_count}")
        print(f"Assignments Completed: {asgn_completed}")
        print(f"Quizzes Completed: {quiz_completed}")
        
        if asgn_completed < required_count:
            print(f"❌ Assignments not met! {asgn_completed} < {required_count}")
        elif quiz_completed < required_count:
            print(f"❌ Quizzes not met! {quiz_completed} < {required_count}")
        else:
            print("✅ Requirements met.")

        # 4. Try Generating PDF
        print(f"\n[PDF Generation Test]")
        CERT_FOLDER = os.path.join(app.root_path, "static", "certificates")
        os.makedirs(CERT_FOLDER, exist_ok=True)
        filename = f"debug_cert_{student.id}_{course.id}.pdf"
        filepath = os.path.join(CERT_FOLDER, filename)
        
        print(f"Target Path: {filepath}")
        try:
            generate_certificate_pdf(student.name, course.name, filepath)
            print("✅ PDF Generated successfully.")
            import os
            if os.path.exists(filepath):
                 print(f"✅ File verified on disk. Size: {os.path.getsize(filepath)} bytes")
            else:
                 print("❌ File NOT found on disk after generation.")
        except Exception as e:
            print(f"❌ PDF Generation Crashed: {e}")
            import traceback
            with open("cert_debug_error.log", "w") as f:
                traceback.print_exc(file=f)
            traceback.print_exc()

if __name__ == "__main__":
    debug_cert()
