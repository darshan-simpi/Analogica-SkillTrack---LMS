from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime
import os

from models import Enrollment, Course, Assignment, Submission, StudentProgress
from extensions import db

student_bp = Blueprint("student", __name__)

UPLOAD_FOLDER = "uploads"

@student_bp.route("/student/dashboard", methods=["GET"])
@jwt_required()
def student_dashboard():
    student_id = int(get_jwt_identity())

    enrollments = Enrollment.query.filter_by(user_id=student_id).all()
    response = []

    for e in enrollments:
        course = Course.query.get(e.course_id)
        assignments = Assignment.query.filter_by(course_id=course.id).all()

        progress = StudentProgress.query.filter_by(
            user_id=student_id,
            course_id=course.id
        ).first()

        response.append({
            "course": course.name,
            "progress": progress.progress if progress else 0,
            "assignments": [
                {
                    "id": a.id,
                    "title": a.title,
                    "due_date": a.due_date,
                    "feedback": next(
                        (s.feedback for s in a.submissions if s.student_id == student_id),
                        None
                    )
                } for a in assignments
            ]
        })

    return jsonify(response), 200


@student_bp.route("/student/submit", methods=["POST"])
@jwt_required()
def submit_assignment():
    student_id = int(get_jwt_identity())
    assignment_id = request.form.get("assignment_id")
    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filename = secure_filename(file.filename)
    path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(path)

    submission = Submission(
        assignment_id=assignment_id,
        student_id=student_id,
        file_path=path,
        submitted_at=datetime.utcnow()
    )

    db.session.add(submission)

    assignment = Assignment.query.get(assignment_id)
    progress = StudentProgress.query.filter_by(
        user_id=student_id,
        course_id=assignment.course_id
    ).first()

    if progress:
        progress.assignments_completed += 1
        progress.progress = int(
            (progress.assignments_completed / max(progress.total_assignments, 1)) * 100
        )

    db.session.commit()
    return jsonify({"message": "Assignment submitted"}), 200
