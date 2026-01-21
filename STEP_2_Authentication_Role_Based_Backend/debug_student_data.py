
from flask import Flask, current_app
from config import Config
from extensions import db
from models import User, Course, Submission, Assignment, Quiz, QuizSubmission, Certificate, Enrollment, StudentProgress

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

def print_student_data(email=None):
    with app.app_context():
        print("Connected to DB")
        
        # List all users
        users = User.query.all()
        print(f"\n[All Users] Count: {len(users)}")
        target_student = None
        for u in users:
            print(f"  - ID: {u.id}, Name: {u.name}, Email: {u.email}, Role: {u.role}")
            if "hima" in u.name.lower() or "hima" in u.email.lower():
                target_student = u
        
        if not target_student:
             print("No students found.")
             return

        student = target_student
        print(f"\n--- Debugging Student: {student.name} (ID: {student.id}, Email: {student.email}) ---")

        # Check Enrollments
        enrollments = Enrollment.query.filter_by(user_id=student.id).all()
        print(f"Enrollments: {[e.course_id for e in enrollments]}")
        
        # Check Progress
        progress = StudentProgress.query.filter_by(user_id=student.id).all()
        print(f"Progress Records: {[p.course_id for p in progress]}")

        # Check Submissions and Grades
        with open("debug_grades_output.txt", "w", encoding="utf-8") as f:
            f.write(f"--- Student: {student.name} ---\n")
            submissions = db.session.query(Submission).filter_by(student_id=student.id).all()
            
            import re
            valid_grades = []
            
            if not submissions:
                f.write("  No submissions found.\n")
            
            for s in submissions:
                assign = Assignment.query.get(s.assignment_id)
                title = assign.title if assign else "Unknown Assignment"
                f.write(f"  - Assignment: {title}\n")
                f.write(f"    Raw Grade: '{s.grade}' (Type: {type(s.grade)})\n")
            
            # Check Certificates and Course Data
            f.write("\n[Course Data]\n")
            certs = Certificate.query.filter_by(user_id=student.id).all()
            
            # Get distinct courses from enrollments/progress
            course_ids = {e.course_id for e in enrollments if e.course_id}
            for p in progress:
                if p.course_id: course_ids.add(p.course_id)
            
            for cid in course_ids:
                course = Course.query.get(cid)
                if course:
                     f.write(f"  - Course ID: {course.id}, Name: {course.name}\n")
                     f.write(f"    Duration: '{course.duration}' (Type: {type(course.duration)})\n")
                     
                     # Quiz Counts
                     quizzes = Quiz.query.filter_by(course_id=course.id).all()
                     f.write(f"    Total Quizzes in DB: {len(quizzes)}\n")
                else:
                     f.write(f"  - Course ID: {cid} (Not Found)\n")

            f.write("\n[Certificates]\n")
            import os
            for c in certs:
                 f.write(f"  - Course {c.course_id}: {c.certificate_url}\n")
                 if c.certificate_url:
                     lpath = c.certificate_url.lstrip("/")
                     fpath = os.path.join(app.root_path, "static", lpath)
                     exists = os.path.exists(fpath)
                     f.write(f"    -> Path check: {fpath}\n")
                     f.write(f"    -> Exists? {exists}\n")

if __name__ == "__main__":
    print_student_data()
