from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer

from models import User
from database import db

auth_bp = Blueprint('auth', __name__)

# 🔐 TOKEN GENERATOR
def get_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'])


# ================= REGISTER =================
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    if not all(k in data for k in ("name", "email", "password", "role")):
        return jsonify({"error": "Missing fields"}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "User already exists"}), 400

    user = User(
        name=data['name'],
        email=data['email'],
        password=generate_password_hash(data['password']),
        role=data['role']
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201


# ================= LOGIN =================
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role}
    )

    return jsonify({
        "token": token,
        "role": user.role,
        "name": user.name
    }), 200


# ================= FORGOT PASSWORD =================
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()

    if not data or "email" not in data:
        return jsonify({"error": "Email required"}), 400

    email = data["email"]
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "Email not registered"}), 404

    serializer = get_serializer()
    token = serializer.dumps(email, salt="reset-password")

    # ✅ IMPORTANT: FRONTEND URL (GitHub Pages)
    FRONTEND_URL = current_app.config.get(
        "FRONTEND_URL",
        "http://127.0.0.1:5500/ROLE_BASED_LOGIN_UI"
    )

    reset_link = f"{FRONTEND_URL}/reset-password.html?token={token}"

    msg = Message(
        subject="Reset Your Password - Analogica SkillTrack LMS",
        recipients=[email],
        body=f"""
Hello {user.name},

You requested to reset your password.

Click the link below to reset it:
{reset_link}

This link is valid for 15 minutes.

If you did not request this, please ignore this email.

Regards,
Analogica SkillTrack LMS
"""
    )

    current_app.extensions["mail"].send(msg)

    return jsonify({"message": "Reset link sent to email"}), 200


# ================= RESET PASSWORD =================
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()

    if not data or "token" not in data or "password" not in data:
        return jsonify({"error": "Token and password required"}), 400

    token = data["token"]
    new_password = data["password"]

    serializer = get_serializer()

    try:
        email = serializer.loads(
            token,
            salt="reset-password",
            max_age=900  # 15 minutes
        )
    except Exception:
        return jsonify({"error": "Invalid or expired token"}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    user.password = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({"message": "Password reset successful"}), 200
