from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer

from models import User
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

    return jsonify({"message": "User registered successfully"}), 201

# ================= LOGIN =================
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()

    if not user or not check_password_hash(user.password, data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role}
    )

    return jsonify({"token": token, "role": user.role, "name": user.name})

# ================= FORGOT PASSWORD =================
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    email = request.json.get("email")
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "Email not registered"}), 404

    token = get_serializer().dumps(email, salt="reset-password")

    reset_link = (
        f"{current_app.config['FRONTEND_URL']}"
        f"/reset-password.html?token={token}"
    )

    msg = Message(
        subject="Reset Your Password - Analogica LMS",
        recipients=[email],
        body=f"""
Hello {user.name},

Click the link below to reset your password:
{reset_link}

This link is valid for 15 minutes.
"""
    )

    mail.send(msg)
    return jsonify({"message": "Reset link sent"}), 200

# ================= RESET PASSWORD =================
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()

    try:
        email = get_serializer().loads(
            data["token"], salt="reset-password", max_age=900
        )
    except:
        return jsonify({"error": "Invalid or expired token"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.password = generate_password_hash(data["password"])
    db.session.commit()

    return jsonify({"message": "Password reset successful"}), 200
