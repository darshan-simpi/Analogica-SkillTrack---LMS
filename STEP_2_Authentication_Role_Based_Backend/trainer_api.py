from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Course, Enrollment, Assignment, Submission, User, CourseResource, StudentProgress
from extensions import db
from student_api import get_required_assignments
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
    course_id = data["course_id"]
    
    course = Course.query.get_or_404(course_id)
    
    # Calculate next week number
    existing_assignments = Assignment.query.filter_by(course_id=course_id).all()
    next_week = len(existing_assignments) + 1
    
    # Enforce duration-based limit (4 per month)
    limit = get_required_assignments(course.duration)
    if next_week > limit:
        return jsonify({"error": f"Maximum assignments ({limit}) reached for this course duration."}), 400

    assignment = Assignment(
        course_id=course_id,
        title=data["title"],
        week_number=next_week,
        due_date=data["due_date"],
        is_released=True
    )
    db.session.add(assignment)

    students = StudentProgress.query.filter_by(course_id=course_id).all()
    for s in students:
        s.total_assignments += 1

    db.session.commit()
    return jsonify({"message": f"Assignment for Week {next_week} assigned", "week_number": next_week}), 201


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
    } for a in assignments])


# ================= SUBMISSIONS =================
@trainer_bp.route("/trainer/assignment/<int:assignment_id>/submissions", methods=["GET"])
@jwt_required()
def get_submissions(assignment_id):
    submissions = Submission.query.filter_by(assignment_id=assignment_id).all()

    result = []
    for s in submissions:
        student = User.query.get(s.student_id)  # ✅ CORRECT

        result.append({
            "submission_id": s.id,
            "student_name": student.name if student else "Unknown",
            "file_url": s.file_path,
            "feedback": s.feedback
        })

    return jsonify(result), 200

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