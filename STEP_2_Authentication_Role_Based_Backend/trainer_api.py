from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Course, Enrollment, Assignment, Submission, User, CourseResource, StudentProgress
from extensions import db
from werkzeug.utils import secure_filename
import os

trainer_bp = Blueprint("trainer", __name__)

# ================= TRAINER DASHBOARD =================
@trainer_bp.route("/trainer/dashboard", methods=["GET"])
@jwt_required()
def trainer_dashboard():
    trainer_id = get_jwt_identity()
    trainer = User.query.get(trainer_id)

    if not trainer or trainer.role != "TRAINER":
        return jsonify({"error": "Unauthorized"}), 403

    courses = Course.query.filter_by(mentor_name=trainer.name).all()

    response = []
    for c in courses:
        students = Enrollment.query.filter_by(course_id=c.id).count()
        response.append({
            "course_id": c.id,
            "course_name": c.name,
            "students": students,
            "duration": c.duration
        })

    return jsonify(response), 200


# ================= ASSIGN ASSIGNMENT =================
@trainer_bp.route("/trainer/assign", methods=["POST"])
@jwt_required()
def assign_assignment():
    data = request.get_json()

    course = Course.query.get_or_404(data["course_id"])
    
    # 🔍 ROBUST DURATION PARSING
    max_assignments = 4 # Fallback
    try:
        duration_str = course.duration.lower()
        # Extract number (e.g., "1 week" -> 1, "2 Months" -> 2)
        import re
        match = re.search(r'(\d+)', duration_str)
        num = int(match.group(1)) if match else 1
        
        if "month" in duration_str:
            max_assignments = num * 4
        elif "week" in duration_str:
            max_assignments = num
    except Exception:
        pass # Keep fallback 4 if parsing fails
        
    # Check 1: Count Limit
    current_count = Assignment.query.filter_by(course_id=course.id).count()
    if current_count >= max_assignments:
        return jsonify({"error": f"Limit reached! This is a {course.duration} course (Max {max_assignments} assignments)."}), 400
        
    # ✅ AUTO-CALCULATE WEEK
    week_num = current_count + 1
    
    # Check 2: Week Limit
    if week_num > max_assignments:
        return jsonify({"error": f"Cannot add Week {week_num}! Max week for {course.duration} course is {max_assignments}."}), 400

    assignment = Assignment(
        course_id=data["course_id"],
        title=data["title"],
        week_number=week_num,
        due_date=data["due_date"],
        is_released=True
    )
    db.session.add(assignment)

    students = StudentProgress.query.filter_by(course_id=data["course_id"]).all()
    for s in students:
        s.total_assignments += 1

    db.session.commit()
    return jsonify({"message": "Assignment assigned"}), 201


# ================= COURSE ASSIGNMENTS =================
@trainer_bp.route("/trainer/course/<int:course_id>/assignments", methods=["GET"])
@jwt_required()
def get_course_assignments(course_id):
    assignments = Assignment.query.filter_by(course_id=course_id).all()

    return jsonify([{
        "id": a.id,
        "title": a.title,
        "week_number": a.week_number,
        "due_date": a.due_date
    } for a in sorted(assignments, key=lambda x: (x.week_number, x.due_date or ""))])


# ================= EDIT ASSIGNMENT =================
@trainer_bp.route("/trainer/assignment/<int:assignment_id>", methods=["PUT"])
@jwt_required()
def update_assignment(assignment_id):
    data = request.get_json()
    assignment = Assignment.query.get_or_404(assignment_id)

    if "title" in data:
        assignment.title = data["title"]
    if "week_number" in data:
        assignment.week_number = data["week_number"]
    if "due_date" in data:
        assignment.due_date = data["due_date"]

    db.session.commit()
    return jsonify({"message": "Assignment updated successfully"}), 200


# ================= DELETE ASSIGNMENT =================
@trainer_bp.route("/trainer/assignment/<int:assignment_id>", methods=["DELETE"])
@jwt_required()
def delete_assignment(assignment_id):
    assignment = Assignment.query.get_or_404(assignment_id)
    
    # Optional: Delete associated submissions manually if cascade isn't set
    # (Assuming we want to clean up)
    Submission.query.filter_by(assignment_id=assignment_id).delete()
    
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({"message": "Assignment deleted successfully"}), 200


# ================= SUBMISSIONS =================
@trainer_bp.route("/trainer/assignment/<int:assignment_id>/submissions", methods=["GET"])
@jwt_required()
def get_submissions(assignment_id):
    submissions = Submission.query.filter_by(assignment_id=assignment_id).all()

    result = []
    for s in submissions:
        student = User.query.get(s.student_id)

        result.append({
            "submission_id": s.id,
            "student_name": student.name if student else "Unknown",
            "file_url": s.file_path,
            "feedback": s.feedback,
            "grade": s.grade,
            "status": s.status
        })

    return jsonify(result), 200

# ================= COURSE SUBMISSIONS =================
@trainer_bp.route("/trainer/course/<int:course_id>/submissions", methods=["GET"])
@jwt_required()
def get_course_submissions(course_id):
    assignments = Assignment.query.filter_by(course_id=course_id).all()
    assignment_ids = [a.id for a in assignments]
    
    submissions = Submission.query.filter(Submission.assignment_id.in_(assignment_ids)).all()

    result = []
    for s in submissions:
        student = User.query.get(s.student_id)
        assignment = Assignment.query.get(s.assignment_id)

        result.append({
            "submission_id": s.id,
            "student_name": student.name if student else "Unknown",
            "assignment_title": assignment.title if assignment else "Unknown",
            "file_url": s.file_path,
            "feedback": s.feedback,
            "grade": s.grade,
            "status": s.status
        })

    return jsonify(result), 200

# ================= UPDATE SUBMISSION (GRADE, FEEDBACK, STATUS) =================
@trainer_bp.route("/trainer/submission/update", methods=["POST"])
@jwt_required()
def update_submission():
    data = request.get_json()
    submission = Submission.query.get_or_404(data["submission_id"])
    
    # Update fields if provided
    if "feedback" in data:
        submission.feedback = data["feedback"]
    if "grade" in data:
        submission.grade = data["grade"]
    
    old_status = submission.status
    if "status" in data:
        submission.status = data["status"]
        
        # Logic regarding progress update on approval is removed to prevent double counting
        # Progress is calculated in student_api.py based on unique submissions


    db.session.commit()
    return jsonify({"message": "Submission updated successfully", "status": submission.status})

# ================= FEEDBACK =================
@trainer_bp.route("/trainer/feedback", methods=["POST"])
@jwt_required()
def give_feedback():
    data = request.get_json()
    submission = Submission.query.get_or_404(data["submission_id"])
    submission.feedback = data["feedback"]
    db.session.commit()
    return jsonify({"message": "Feedback saved"})


# ================= RESOURCE UPLOAD =================
@trainer_bp.route("/trainer/course/<int:course_id>/resource/upload", methods=["POST"])
@jwt_required()
def upload_resource(course_id):
    file = request.files.get("file")
    title = request.form.get("title")

    if not file:
        return jsonify({"error": "File required"}), 400

    os.makedirs("uploads/resources", exist_ok=True)
    filename = secure_filename(file.filename)
    path = f"uploads/resources/{filename}"
    file.save(path)

    resource = CourseResource(
        course_id=course_id,
        title=title,
        type=file.content_type,
        url=path
    )

    db.session.add(resource)
    db.session.commit()
    return jsonify({"message": "Resource uploaded"}), 201


# ================= GET RESOURCES =================
@trainer_bp.route("/trainer/course/<int:course_id>/resources", methods=["GET"])
@jwt_required()
def get_resources(course_id):
    resources = CourseResource.query.filter_by(course_id=course_id).all()

    return jsonify([{
        "id": r.id,
        "title": r.title,
        "type": r.type,
        "url": r.url
    } for r in resources])


# ================= DELETE RESOURCE =================
@trainer_bp.route("/trainer/resource/<int:resource_id>", methods=["DELETE"])
@jwt_required()
def delete_resource(resource_id):
    resource = CourseResource.query.get_or_404(resource_id)
    db.session.delete(resource)
    db.session.commit()
    return jsonify({"message": "Deleted"})