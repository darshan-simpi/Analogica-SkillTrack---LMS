from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt,
    get_jwt_identity
)
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer

from models import User, StudentProgress, Enrollment, Task, Submission, TaskSubmission, Certificate
from extensions import db, mail

auth_bp = Blueprint("auth", __name__)

def get_serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"])

# ================= REGISTER =================
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "User already exists"}), 400

    user = User(
        name=data["name"],
        email=data["email"],
        password=generate_password_hash(data["password"]),
        role=data["role"]
    )

    db.session.add(user)
    db.session.commit()

    if data["role"] == "STUDENT" and "course_id" in data:
        enrollment = Enrollment(
            user_id=user.id,
            course_id=data["course_id"]
        )
        db.session.add(enrollment)

        student_progress = StudentProgress(
            user_id=user.id,
            course_id=data["course_id"],
            status="Enrolled"
        )
        db.session.add(student_progress)

        # ✅ BACKFILL TASKS FOR NEW STUDENT
        existing_tasks = Task.query.filter_by(course_id=data["course_id"]).all()
        # Filter to ensure we only copy templates or those assigned to others (deduplication needed effectively)
        # Actually, tasks are currently 1-per-student. So we need to find "Templates".
        # Since we don't have a separate Template table, we'll find UNIQUE tasks by Title for this course.
        
        unique_templates = {}
        for t in existing_tasks:
            if t.title not in unique_templates:
                unique_templates[t.title] = t
        
        for _, t in unique_templates.items():
            new_task = Task(
                title=t.title,
                description=t.description,
                assigned_to=user.id, # Assign to NEW user
                assigned_by=t.assigned_by,
                course_id=data["course_id"],
                priority=t.priority,
                due_date=t.due_date,
                status="Pending",
                week_number=t.week_number
            )
            db.session.add(new_task)


    if data["role"] == "INTERN" and "internship_id" in data:
        enrollment = Enrollment(
            user_id=user.id,
            internship_id=data["internship_id"]
        )
        db.session.add(enrollment)

        # ✅ BACKFILL TASKS FOR NEW INTERN
        existing_tasks = Task.query.filter_by(internship_id=data["internship_id"]).all()
        unique_templates = {}
        for t in existing_tasks:
            if t.title not in unique_templates:
                unique_templates[t.title] = t
                
        for _, t in unique_templates.items():
            new_task = Task(
                title=t.title,
                description=t.description,
                assigned_to=user.id,
                assigned_by=t.assigned_by,
                internship_id=data["internship_id"],
                priority=t.priority,
                due_date=t.due_date,
                status="Pending",
                week_number=t.week_number
            )
            db.session.add(new_task)

    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201


# ================= LOGIN =================
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()

    if not user or not check_password_hash(user.password, data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    # ✅ FIX: identity MUST be string
    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role}
    )

    return jsonify({
        "token": token,
        "role": user.role,
        "name": user.name
    }), 200



# ================= FORGOT PASSWORD =================
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        # For security, we might not want to reveal if user exists, but for debugging/usability providing 404 or specific error is okay.
        # Sticking to 404 as user expects it or 400.
        return jsonify({"error": "User not found"}), 404

    token = get_serializer().dumps(email, salt="reset-password")

    # Construct reset link
    reset_link = f"{current_app.config['FRONTEND_URL']}/reset-password.html?token={token}"

    msg = Message(
        subject="Password Reset Request",
        recipients=[email],
        body=f"Click the link to reset your password: {reset_link}\n\nThis link expires in 15 minutes."
    )

    try:
        mail.send(msg)
    except Exception as e:
        print(f"Error sending email: {e}")
        return jsonify({"error": "Failed to send email"}), 500

    return jsonify({"message": "Password reset link sent"}), 200


# ================= RESET PASSWORD =================
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()

    try:
        email = get_serializer().loads(
            data["token"],
            salt="reset-password",
            max_age=900
        )
    except:
        return jsonify({"error": "Invalid or expired token"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.password = generate_password_hash(data["password"])
    db.session.commit()

    return jsonify({"message": "Password reset successful"}), 200


# ================= GET USERS =================
@auth_bp.route("/users", methods=["GET"])
@jwt_required()
def get_users():
    claims = get_jwt()
    if claims.get("role") != "TRAINER" and claims.get("role") != "ADMIN":
        return jsonify({"error": "Unauthorized"}), 403

    role = request.args.get("role")
    if role:
        users = User.query.filter_by(role=role).all()
    else:
        users = User.query.all()

    return jsonify([
        {
            "id": u.id, 
            "name": u.name, 
            "email": u.email, 
            "role": u.role,
            "enrollments": [
                {
                    "type": "Course" if e.course_id else "Internship",
                    "id": e.course_id or e.internship_id,
                    "enrollment_id": e.id,
                    "title": (e.course.name if e.course_id else e.internship.intern_name) if (e.course or e.internship) else "Unknown"
                } for e in u.enrollments
            ]
        }
        for u in users
    ]), 200
@auth_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    user = User.query.get_or_404(user_id)
    
    # ✅ ROBUST MANUAL CASCADE DELETE
    
    # 1. DEPENDENCIES WHERE USER IS THE *SOURCE* (Student/Intern)
    # -----------------------------------------------------------
    # Enrollments & Progress
    Enrollment.query.filter_by(user_id=user_id).delete()
    StudentProgress.query.filter_by(user_id=user_id).delete()
    
    # Certificates
    Certificate.query.filter_by(user_id=user_id).delete()
    
    # Submissions (Assignments)
    Submission.query.filter_by(student_id=user_id).delete()
    
    # Quiz Submissions
    from models import QuizSubmission # Ensure import
    QuizSubmission.query.filter_by(student_id=user_id).delete()
    
    # Task Submissions (Intern) - Deleting their submissions to tasks
    TaskSubmission.query.filter_by(student_id=user_id).delete()
    
    # Tasks Assigned TO the user (Intern)
    # Note: If we delete tasks assigned TO them, we must first ensure THOSE tasks don't have submissions (which we just deleted above).
    Task.query.filter_by(assigned_to=user_id).delete()


    # 2. DEPENDENCIES WHERE USER IS THE *CREATOR* (Trainer)
    # -----------------------------------------------------------
    # Tasks Assigned BY the user (Trainer)
    # These tasks might have submissions from OTHER students/interns.
    # We must delete those submissions first.
    
    tasks_created_by_user = Task.query.filter_by(assigned_by=user_id).all()
    for t in tasks_created_by_user:
        # Delete submissions for this task (by anyone)
        TaskSubmission.query.filter_by(task_id=t.id).delete()
        # Delete the task itself
        db.session.delete(t)
        
    # Note: We do NOT delete Courses or Workshops created by them because they use 'mentor_name' (string) 
    # instead of foreign keys in this schema, so no crash will occur.

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": f"User {user.name} and all related records deleted"}), 200

@auth_bp.route("/enrollments/<int:enrollment_id>", methods=["DELETE"])
@jwt_required()
def remove_enrollment(enrollment_id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    enrollment = Enrollment.query.get_or_404(enrollment_id)
    user_id = enrollment.user_id
    
    # Clean up related progress/tasks for this SPECIFIC course/internship
    if enrollment.course_id:
        StudentProgress.query.filter_by(user_id=user_id, course_id=enrollment.course_id).delete()
        Task.query.filter_by(assigned_to=user_id, course_id=enrollment.course_id).delete()
    elif enrollment.internship_id:
        Task.query.filter_by(assigned_to=user_id, internship_id=enrollment.internship_id).delete()

    db.session.delete(enrollment)
    db.session.commit()

    return jsonify({"message": "Enrollment removed successfully"}), 200
@auth_bp.route("/users/<int:user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    user = User.query.get_or_404(user_id)

    if "name" in data:
        user.name = data["name"]
    if "email" in data:
        user.email = data["email"]
    if "role" in data:
        user.role = data["role"]
    
    db.session.commit()

    return jsonify({"message": "User updated successfully"}), 200
