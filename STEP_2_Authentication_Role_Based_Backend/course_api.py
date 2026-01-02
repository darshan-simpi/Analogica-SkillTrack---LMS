from flask import Blueprint, request, jsonify
from models import Course
from database import db
from flask_jwt_extended import jwt_required

course_bp = Blueprint("course_bp", __name__)

@course_bp.route("/courses", methods=["GET"])
def get_courses():
    courses = Course.query.all()
    return jsonify([
        {"id": c.id, "name": c.name, "date": c.start_date}
        for c in courses
    ])

@course_bp.route("/courses", methods=["POST"])
@jwt_required()
def add_course():
    data = request.json
    course = Course(name=data["name"], start_date=data["date"])
    db.session.add(course)
    db.session.commit()
    return {"message": "Course added"}
