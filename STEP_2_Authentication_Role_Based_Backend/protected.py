from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from role_required import role_required

protected_bp = Blueprint('protected', __name__)

@protected_bp.route('/admin')
@jwt_required()
@role_required(['ADMIN'])
def admin():
    return jsonify({"message": "Admin access granted"})

@protected_bp.route('/student')
@jwt_required()
@role_required(['STUDENT'])
def student():
    return jsonify({"message": "Student access granted"})

@protected_bp.route('/trainer')
@jwt_required()
@role_required(['TRAINER'])
def trainer():
    return jsonify({"message": "Trainer access granted"})

@protected_bp.route('/intern')
@jwt_required()
@role_required(['INTERN'])
def intern():
    return jsonify({"message": "Intern access granted"})
