from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime
import os

from models import Enrollment, Course, Assignment, Submission, StudentProgress, CourseResource, Certificate
from extensions import db

student_bp = Blueprint("student", __name__)

UPLOAD_FOLDER = "uploads"

# ✅ NEW PROGRESS ENDPOINT
@student_bp.route("/student/progress", methods=["GET"])
@jwt_required()
def student_progress():
    student_id = int(get_jwt_identity())
    enrollments = Enrollment.query.filter_by(user_id=student_id).all()
    response = []

    for e in enrollments:
        course = Course.query.get(e.course_id)
        if not course: continue
        
        progress = StudentProgress.query.filter_by(user_id=student_id, course_id=course.id).first()
        
        response.append({
            "course_id": course.id,
            "course_name": course.name,
            "status": progress.status if progress else "Active",
            "progress": progress.progress if progress else 0,
            "assignments_completed": progress.assignments_completed if progress else 0,
            "total_assignments": progress.total_assignments if progress else 0,
            "duration": course.duration
        })

    return jsonify(response), 200

# ✅ MAIN DASHBOARD ENDPOINT
@student_bp.route("/student/dashboard", methods=["GET"])
@jwt_required()
def student_dashboard():
    student_id = int(get_jwt_identity())

    enrollments = Enrollment.query.filter_by(user_id=student_id).all()
    response = []

    for e in enrollments:
        course = Course.query.get(e.course_id)
        if not course:
            continue
            
        assignments = Assignment.query.filter_by(course_id=course.id).all()

        progress = StudentProgress.query.filter_by(
            user_id=student_id,
            course_id=course.id
        ).first()

        # Get submissions for this student once
        student_submissions = Submission.query.filter_by(student_id=student_id).all()
        submitted_assignment_ids = [s.assignment_id for s in student_submissions]

        # Assignments logic with unlocking
        assignments_list = []
        # Sort by week number to handle unlocking sequentially
        sorted_assignments = sorted(assignments, key=lambda x: x.week_number)
        
        for i, a in enumerate(sorted_assignments):
            # Unlock if it is released by trainer
            # AND (it's the first one OR the previous one is submitted)
            is_unlocked = False
            
            # 1. Bypass release check (Assignment appears if it exists)
            # if a.is_released:  <-- REMOVED CHECK

            # 2. Check sequential logic
            if i == 0:
                is_unlocked = True
            else:
                previous_assignment = sorted_assignments[i-1]
                prev_id = previous_assignment.id
                if prev_id in submitted_assignment_ids:
                    is_unlocked = True

            assignments_list.append({
                "id": a.id,
                "title": a.title,
                "week_number": a.week_number,
                "due_date": a.due_date,
                "is_unlocked": is_unlocked,
                "is_submitted": a.id in submitted_assignment_ids,
                "feedback": next((s.feedback for s in student_submissions if s.assignment_id == a.id), None)
            })

        # Calculate dynamic progress
        course_assignments_ids = [a.id for a in assignments]
        completed_count = len([aid for aid in submitted_assignment_ids if aid in course_assignments_ids])
        total_count = len(assignments)
        dynamic_progress = int((completed_count / max(total_count, 1)) * 100) if total_count > 0 else 0

        response.append({
            "course_id": course.id,
            "course": course.name,
            "progress": dynamic_progress,
            "assignments": assignments_list,
            "can_generate_certificate": total_count > 0 and completed_count == total_count
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

@student_bp.route("/student/course/<int:course_id>/resources", methods=["GET"])
@jwt_required()
def get_course_resources(course_id):
    resources = CourseResource.query.filter_by(course_id=course_id).all()
    return jsonify([{
        "id": r.id,
        "title": r.title,
        "type": r.type,
        "url": r.url
    } for r in resources]), 200

@student_bp.route("/student/certificate/<int:course_id>", methods=["POST"])
@jwt_required()
def generate_certificate(course_id):
    student_id = int(get_jwt_identity())
    
    # Check if all assignments are submitted
    assignments = Assignment.query.filter_by(course_id=course_id).all()
    if not assignments:
        return jsonify({"error": "No assignments found for this course"}), 400
        
    submissions = Submission.query.filter_by(student_id=student_id).all()
    submitted_ids = [s.assignment_id for s in submissions]
    
    if not all(a.id in submitted_ids for a in assignments):
        return jsonify({"error": "All assignments must be submitted first"}), 403

    # Check if already exists
    existing = Certificate.query.filter_by(user_id=student_id, course_id=course_id).first()
    if existing:
        return jsonify({"message": "Certificate already generated", "url": existing.certificate_url}), 200

    # Create dummy certificate entry
    cert = Certificate(
        user_id=student_id,
        course_id=course_id,
        certificate_url=f"/certificates/cert_{student_id}_{course_id}.pdf"
    )
    db.session.add(cert)
    db.session.commit()
    
    return jsonify({"message": "Certificate generated successfully", "url": cert.certificate_url}), 201