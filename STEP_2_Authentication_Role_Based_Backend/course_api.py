from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import Course, Workshop, Internship, StudentProgress

course_bp = Blueprint("course_api", __name__)

# ================= COURSES =================

@course_bp.route("/courses", methods=["GET"])
def get_courses():
    courses = Course.query.all()
    return jsonify([
        {
            "id": c.id,
            "name": c.name,
            "date": c.start_date
        }
        for c in courses
    ]), 200


@course_bp.route("/courses", methods=["POST"])
@jwt_required()
def add_course():
    data = request.get_json()

    course = Course(
        name=data.get("name"),
        start_date=data.get("date")
    )

    db.session.add(course)
    db.session.commit()

    return jsonify({"message": "Course added successfully"}), 201


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
    data = request.get_json()

    workshop = Workshop(
        title=data.get("title"),
        trainer_name=data.get("trainer_name"),
        date=data.get("date")
    )

    db.session.add(workshop)
    db.session.commit()

    return jsonify({"message": "Workshop added successfully"}), 201


# ================= INTERNSHIPS (🔥 FIXED) =================

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
    data = request.get_json()

    internship = Internship(
        intern_name=data.get("intern_name"),   # ✅ FIXED
        mentor_name=data.get("mentor_name"),
        duration=data.get("duration")
    )

    db.session.add(internship)
    db.session.commit()

    return jsonify({"message": "Internship added successfully"}), 201


# ================= STUDENT PROGRESS =================

@course_bp.route("/progress/<int:user_id>", methods=["GET"])
@jwt_required()
def get_student_progress(user_id):
    progress = StudentProgress.query.filter_by(user_id=user_id).all()

    return jsonify([
        {
            "course_id": p.course_id,
            "progress": p.progress,
            "status": p.status,
            "assignments_completed": p.assignments_completed,
            "total_assignments": p.total_assignments
        }
        for p in progress
    ]), 200
