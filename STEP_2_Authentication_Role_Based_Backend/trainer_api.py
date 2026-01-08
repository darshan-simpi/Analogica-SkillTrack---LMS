from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Course, Enrollment, Assignment, Submission, User
from extensions import db

trainer_bp = Blueprint("trainer", __name__)

# 1. Trainer dashboard data
@trainer_bp.route("/trainer/dashboard", methods=["GET"])
@jwt_required()
def trainer_dashboard():
    trainer = get_jwt_identity()

    courses = Course.query.all()  # later filter trainer-wise

    response = []
    for c in courses:
        students = Enrollment.query.filter_by(course_id=c.id).count()
        response.append({
            "course_id": c.id,
            "course_name": c.name,
            "students": students
        })

    return jsonify(response)

# 2. Assign assignment to course
@trainer_bp.route("/trainer/assign", methods=["POST"])
@jwt_required()
def assign_assignment():
    data = request.get_json()

    assignment = Assignment(
        course_id=data["course_id"],
        title=data["title"],
        due_date=data["due_date"]
    )
    db.session.add(assignment)
    db.session.commit()

    return jsonify({"message": "Assignment assigned successfully"})

# 3. Give feedback
@trainer_bp.route("/trainer/feedback", methods=["POST"])
@jwt_required()
def give_feedback():
    data = request.get_json()

    submission = Submission.query.get(data["submission_id"])
    submission.grade = data["feedback"]
    db.session.commit()

    return jsonify({"message": "Feedback saved"})
