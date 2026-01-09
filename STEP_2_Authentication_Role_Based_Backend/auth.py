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

from models import User, StudentProgress, Enrollment
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
        {"id": u.id, "name": u.name, "email": u.email, "role": u.role}
        for u in users
    ]), 200
@auth_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "User deleted"}), 200
@auth_bp.route("/users/<int:user_id>", methods=["PUT"])
@jwt_required()
def update_user_role(user_id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    user = User.query.get_or_404(user_id)

    user.role = data.get("role")
    db.session.commit()

    return jsonify({"message": "User role updated"}), 200
