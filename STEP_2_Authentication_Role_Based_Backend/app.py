from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from werkzeug.security import generate_password_hash
from flask import send_from_directory

from config import Config
from extensions import db, mail
from models import User, Internship, Task, Enrollment
from auth import auth_bp
from course_api import course_bp
from trainer_api import trainer_bp
from student_api import student_bp



def create_default_admin():
    admin_email = "admin@analogica.com"
    if not User.query.filter_by(email=admin_email).first():
        admin = User(
            name="Super Admin",
            email=admin_email,
            password=generate_password_hash("Admin@123"),
            role="ADMIN"
        )
        db.session.add(admin)
        db.session.commit()
        print("✅ Default admin created")


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # 🔥 IMPORTANT CORS FIX
    # 🔥 IMPORTANT CORS FIX
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response

    db.init_app(app)
    mail.init_app(app)
    jwt = JWTManager(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(course_bp, url_prefix="/api")
    app.register_blueprint(trainer_bp, url_prefix="/api")
    app.register_blueprint(student_bp, url_prefix="/api")

    @app.route("/api/uploads/<path:filename>")
    def serve_uploads(filename):
        return send_from_directory("uploads", filename)

    @app.route("/uploads/<path:filename>")
    def serve_uploads_root(filename):
        return send_from_directory("uploads", filename)

    @app.route("/api/certificates/<path:filename>")
    def serve_certificates(filename):
        return send_from_directory("static/certificates", filename)

    @app.route("/")
    def home():
        return {"message": "Analogica LMS Backend Running"}

    with app.app_context():
        print("🔄 Connecting to Database...")
        db.create_all()
        print("✅ Database Connected & Tables Verified!")
        
        # ✅ FIX:        # Schema updates (Individual checks)
        with db.engine.connect() as conn:
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN last_activity_date DATE"))
            except Exception: pass
            
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0"))
            except Exception: pass
            
            try:
                conn.execute(db.text("ALTER TABLE tasks ADD COLUMN week_number INTEGER DEFAULT 1"))
            except Exception: pass
            
            try:
                conn.execute(db.text("ALTER TABLE tasks ADD COLUMN internship_id INTEGER"))
            except Exception: pass

            try:
                conn.execute(db.text("ALTER TABLE enrollments ADD COLUMN internship_id INTEGER"))
            except Exception: pass
            
            try:
                # Modify course_id to be nullable. Syntax depends on DB. 
                # For MySQL: MODIFY COLUMN course_id INTEGER NULL
                conn.execute(db.text("ALTER TABLE enrollments MODIFY COLUMN course_id INTEGER NULL"))
            except Exception: pass

            try:
                conn.execute(db.text("ALTER TABLE courses ADD COLUMN assignment_limit INTEGER"))
                print("✅ Added assignment_limit column to courses")
            except Exception: pass

            try:
                conn.execute(db.text("ALTER TABLE courses ADD COLUMN quiz_limit INTEGER"))
                print("✅ Added quiz_limit column to courses")
            except Exception: pass
            
            # ✅ NEW: Add course_id to tasks
            try:
                conn.execute(db.text("ALTER TABLE tasks ADD COLUMN course_id INTEGER"))
                print("✅ Added course_id column to tasks")
            except Exception: pass

            try:
                conn.execute(db.text("ALTER TABLE internships ADD COLUMN assignment_limit INTEGER"))
                print("✅ Added assignment_limit column to internships")
            except Exception: pass
            
            # ✅ DATA MIGRATION: Backfill course_id for existing tasks
            # Logic: If task assigned_to user who is enrolled in a course, set task.course_id to that course_id
            try:
                # We need to do this via ORM for simplicity or raw SQL
                # Let's do a safe raw SQL update for common cases or use Python iteration
                pass # Logic moved to explicit function called below to ensure app context
            except Exception: pass

            print("✅ Verified DB Schema")

        # Explicit Data Backfill
        try:
            # Re-fetch all tasks with missing course_id
            tasks = Task.query.filter(Task.course_id == None, Task.internship_id == None).all()
            if tasks:
                print(f"🔄 Migrating {len(tasks)} tasks...")
                for t in tasks:
                    # Find enrollment for the assigned student
                    # Assuming 1 active course per student for now or matching trainer
                    # Better: Find enrollment where student matches AND (maybe check trainer?)
                    # Simple heuristic: If student has only 1 enrollment, use that.
                    enrollments = Enrollment.query.filter_by(user_id=t.assigned_to).all()
                    # Filter only course enrollments
                    course_enrolls = [e for e in enrollments if e.course_id]
                    
                    if len(course_enrolls) == 1:
                        t.course_id = course_enrolls[0].course_id
                    elif len(course_enrolls) > 1:
                        # Ambiguous: assignments usually have course_id in other tables, but Task is generic
                        # If assigned_by is a trainer, check which course that trainer mentors?
                        # This is "good enough" for now.
                        t.course_id = course_enrolls[0].course_id 
                
                db.session.commit()
                print("✅ Task Migration Completed")
        except Exception as e:
            print(f"⚠️ Migration warning: {e}")

        create_default_admin()
        
    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5005)