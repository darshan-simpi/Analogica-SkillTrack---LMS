from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from models import User
from database import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json

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


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()

    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(
        identity=str(user.id),                 # ✅ string
        additional_claims={"role": user.role}  # ✅ role in claims
    )

    return jsonify({
        "token": token,
        "role": user.role,
        "name": user.name
    })
