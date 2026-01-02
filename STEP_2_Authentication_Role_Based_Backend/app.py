from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail

from config import Config
from database import db
from auth import auth_bp
from protected import protected_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ✅ Enable CORS (GitHub Pages → Render)
    CORS(app)

    # ✅ Init extensions
    db.init_app(app)
    JWTManager(app)
    Mail(app)

    # ✅ Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(protected_bp, url_prefix='/api')

    @app.route('/')
    def home():
        return {"message": "Authentication & Role Based APIs Running"}

    # ✅ Create DB tables
    with app.app_context():
        db.create_all()

    return app


# 🔹 For Render / WSGI
app = create_app()

# 🔹 For LOCAL TESTING ONLY
if __name__ == "__main__":
    app.run(debug=True)
