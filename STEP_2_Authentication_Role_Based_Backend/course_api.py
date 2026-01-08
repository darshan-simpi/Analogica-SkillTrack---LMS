from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models import Course, Workshop, Internship, User, Task, Submission, Enrollment, StudentProgress

course_bp = Blueprint("course_api", __name__)

# ================= COURSES =================

@course_bp.route("/courses", methods=["GET"])
def get_courses():
    courses = Course.query.all()
    return jsonify([
        {
            "id": c.id,
            "name": c.name,
            "date": c.start_date,
            "mentor_name": c.mentor_name,
            "duration": c.duration
        }
        for c in courses
    ]), 200


@course_bp.route("/courses", methods=["POST"])
@jwt_required()
def add_course():
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()

    course = Course(
        name=data.get("name"),
        start_date=data.get("date"),
        mentor_name=data.get("mentor_name"),  # ✅
        duration=data.get("duration")         # ✅
    )

    db.session.add(course)
    db.session.commit()
    return jsonify({"message": "Course added"}), 201


@course_bp.route("/courses/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_course(id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    course = Course.query.get_or_404(id)
    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted"}), 200


# ================= WORKSHOPS =================

@course_bp.route("/workshops", methods=["GET"])
def get_workshops():
    workshops = Workshop.query.all()
    return jsonify([
        {
            "id": w.id,
            "title": w.title,
            "trainer_name": w.trainer_name,
            "date": w.date
        }
        for w in workshops
    ]), 200


@course_bp.route("/workshops", methods=["POST"])
@jwt_required()
def add_workshop():
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    workshop = Workshop(
        title=data.get("title"),
        trainer_name=data.get("trainer_name"),
        date=data.get("date")
    )
    db.session.add(workshop)
    db.session.commit()
    return jsonify({"message": "Workshop added"}), 201


@course_bp.route("/workshops/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_workshop(id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    workshop = Workshop.query.get_or_404(id)
    db.session.delete(workshop)
    db.session.commit()
    return jsonify({"message": "Workshop deleted"}), 200


# ================= INTERNSHIPS =================

@course_bp.route("/internships", methods=["GET"])
def get_internships():
    internships = Internship.query.all()
    return jsonify([
        {
            "id": i.id,
            "intern_name": i.intern_name,
            "mentor_name": i.mentor_name,
            "duration": i.duration
        }
        for i in internships
    ]), 200


@course_bp.route("/internships", methods=["POST"])
@jwt_required()
def add_internship():
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    internship = Internship(
        intern_name=data.get("intern_name"),
        mentor_name=data.get("mentor_name"),
        duration=data.get("duration")
    )
    db.session.add(internship)
    db.session.commit()
    return jsonify({"message": "Internship added"}), 201


@course_bp.route("/internships/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_internship(id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    internship = Internship.query.get_or_404(id)
    db.session.delete(internship)
    db.session.commit()
    return jsonify({"message": "Internship deleted"}), 200


# ================= ADMIN DASHBOARD STATS =================

@course_bp.route("/admin/stats", methods=["GET"])
@jwt_required()
def admin_stats():
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    return jsonify({
        "students": User.query.filter_by(role="STUDENT").count(),
        "trainers": User.query.filter_by(role="TRAINER").count(),
        "interns": User.query.filter_by(role="INTERN").count(),
        "courses": Course.query.count()
    }), 200

@course_bp.route("/interns", methods=["GET"])
@jwt_required()
def get_interns():
    interns = User.query.filter_by(role="INTERN").all()
    return jsonify([{
        "id": intern.id,
        "name": intern.name,
        "email": intern.email
    } for intern in interns]), 200


# ================= TASKS =================

@course_bp.route("/tasks", methods=["GET"])
@jwt_required()
def get_tasks():
    claims = get_jwt()
    user_id = get_jwt_identity()
    role = claims.get("role")

    if role == "INTERN" or role == "STUDENT":
        tasks = Task.query.filter_by(assigned_to=user_id).all()
    elif role == "TRAINER":
        tasks = Task.query.filter_by(assigned_by=user_id).all()
    else:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify([
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date,
            "assigned_by": User.query.get(t.assigned_by).name if t.assigned_by else None
        }
        for t in tasks
    ]), 200


@course_bp.route("/student/courses", methods=["GET"])
@jwt_required()
def get_student_courses():
    user_id = get_jwt_identity()
    progress_records = StudentProgress.query.filter_by(user_id=user_id).all()
    
    enrolled_courses = []
    for p in progress_records:
        course = Course.query.get(p.course_id)
        if course:
            enrolled_courses.append({
                "id": course.id,
                "name": course.name,
                "date": course.start_date,
                "status": p.status
            })
            
    return jsonify(enrolled_courses), 200




@course_bp.route("/tasks", methods=["POST"])
@jwt_required()
def assign_task():
    claims = get_jwt()
    if claims.get("role") != "TRAINER":
        return jsonify({"error": "Trainer access required"}), 403

    data = request.get_json()
    trainer_id = get_jwt_identity()
    
    tasks_to_create = []
    
    # 1. Assign to Course (All Students in Course)
    if data.get("course_id"):
        students = StudentProgress.query.filter_by(course_id=data["course_id"]).all()
        for s in students:
            tasks_to_create.append(Task(
                title=data.get("title"),
                description=data.get("description"),
                assigned_to=s.user_id,
                assigned_by=trainer_id,
                priority=data.get("priority", "Medium"),
                due_date=data.get("due_date")
            ))
            
    # 2. Assign to Internship (All Interns in Internship)
    elif data.get("internship_id"):
        enrollments = Enrollment.query.filter_by(internship_id=data["internship_id"]).all()
        for e in enrollments:
            tasks_to_create.append(Task(
                title=data.get("title"),
                description=data.get("description"),
                assigned_to=e.user_id,
                assigned_by=trainer_id,
                priority=data.get("priority", "Medium"),
                due_date=data.get("due_date")
            ))
            
    # 3. Assign to Individual
    elif data.get("assigned_to"):
        tasks_to_create.append(Task(
            title=data.get("title"),
            description=data.get("description"),
            assigned_to=data.get("assigned_to"),
            assigned_by=trainer_id,
            priority=data.get("priority", "Medium"),
            due_date=data.get("due_date")
        ))
    
    if not tasks_to_create:
        return jsonify({"error": "No valid targets found for assignment"}), 400

    db.session.add_all(tasks_to_create)
    db.session.commit()
    return jsonify({"message": f"Task assigned to {len(tasks_to_create)} users"}), 201


@course_bp.route("/tasks/<int:id>", methods=["PUT"])
@jwt_required()
def update_task(id):
    claims = get_jwt()
    task = Task.query.get_or_404(id)
    user_id = get_jwt_identity()
    role = claims.get("role")

    if role == "INTERN" and task.assigned_to != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    if role == "TRAINER" and task.assigned_by != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    if "status" in data:
        task.status = data["status"]
    if "description" in data and role == "TRAINER":
        task.description = data["description"]
    db.session.commit()
    return jsonify({"message": "Task updated"}), 200


@course_bp.route("/tasks/<int:id>/submit", methods=["POST"])
@jwt_required()
def submit_task(id):
    claims = get_jwt()
    task = Task.query.get_or_404(id)
    if task.assigned_to != get_jwt_identity():
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    submission = Submission(
        task_id=id,
        submitted_by=get_jwt_identity(),
        content=data.get("content")
    )
    task.status = "Submitted"
    db.session.add(submission)
    db.session.commit()
    return jsonify({"message": "Task submitted"}), 201


@course_bp.route("/submissions", methods=["GET"])
@jwt_required()
def get_submissions():
    claims = get_jwt()
    if claims.get("role") != "TRAINER":
        return jsonify({"error": "Trainer access required"}), 403

    submissions = Submission.query.join(Task).filter(Task.assigned_by == get_jwt_identity()).all()
    return jsonify([
        {
            "id": s.id,
            "task_title": Task.query.get(s.task_id).title,
            "submitted_by": User.query.get(s.submitted_by).name,
            "content": s.content,
            "submitted_at": s.submitted_at.isoformat()
        }
        for s in submissions
    ]), 200


# ================= ENROLLMENTS =================

@course_bp.route("/enrollments", methods=["GET"])
@jwt_required()
def get_enrollments():
    user_id = get_jwt_identity()

    enrollments = Enrollment.query.filter_by(user_id=user_id).all()
    enrolled_internships = []
    for e in enrollments:
        internship = Internship.query.get(e.internship_id)
        if internship:
            enrolled_internships.append({
                "id": internship.id,
                "intern_name": internship.intern_name,
                "mentor_name": internship.mentor_name,
                "duration": internship.duration,
                "enrolled_at": e.enrolled_at.isoformat()
            })
    return jsonify(enrolled_internships), 200


@course_bp.route("/enrollments", methods=["POST"])
@jwt_required()
def enroll_internship():
    user_id = get_jwt_identity()

    data = request.get_json()
    internship_id = data.get("internship_id")

    if not internship_id:
        return jsonify({"error": "Internship ID required"}), 400

    # Check if already enrolled
    existing = Enrollment.query.filter_by(user_id=user_id, internship_id=internship_id).first()
    if existing:
        return jsonify({"error": "Already enrolled"}), 400

    enrollment = Enrollment(user_id=user_id, internship_id=internship_id)
    db.session.add(enrollment)
    db.session.commit()
    return jsonify({"message": "Enrolled successfully"}), 201


@course_bp.route("/student/progress", methods=["GET"])
@jwt_required()
def get_student_progress():
    user_id = get_jwt_identity()
    progress_records = StudentProgress.query.filter_by(user_id=user_id).all()
    
    results = []
    for p in progress_records:
        course = Course.query.get(p.course_id)
        if course:
            results.append({
                "course_name": course.name,
                "progress": p.progress,
                "status": p.status,
                "assignments_completed": p.assignments_completed,
                "total_assignments": p.total_assignments
            })
            
    return jsonify(results), 200


@course_bp.route("/mentors", methods=["GET"])
@jwt_required()
def get_all_mentors():
    trainers = User.query.filter_by(role="TRAINER").all()
    return jsonify([
        {
            "id": t.id, 
            "name": t.name, 
            "email": t.email,
            "expertise": "Course Instructor" # Placeholder as model lacks this field
        }
        for t in trainers
    ]), 200