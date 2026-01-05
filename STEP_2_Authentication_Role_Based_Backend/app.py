from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from werkzeug.security import generate_password_hash

from config import Config
from extensions import db, mail
from models import User
from auth import auth_bp
from protected import protected_bp
from course_api import course_bp

def create_default_admin():
    admin_email = "admin@analogica.com"
    if not User.query.filter_by(email=admin_email).first():
        admin = User(
            name="Super Admin",
            email=admin_email,
            password=generate_password_hash("Admin@123"),
            role="ADMIN"
        )
        db.session.add(admin)
        db.session.commit()
        print("✅ Default admin created")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)
    mail.init_app(app)
    JWTManager(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(protected_bp, url_prefix="/api")
    app.register_blueprint(course_bp, url_prefix="/api")

    @app.route("/")
    def home():
        return {"message": "Authentication & Role Based APIs Running"}

    with app.app_context():
        db.create_all()
        create_default_admin()

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
