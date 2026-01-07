from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models import Course, Workshop, Internship, User

course_bp = Blueprint("course_api", __name__)

# ================= COURSES =================

@course_bp.route("/courses", methods=["GET"])
def get_courses():
    courses = Course.query.all()
    return jsonify([
        {"id": c.id, "name": c.name, "date": c.start_date}
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
        start_date=data.get("date")
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
