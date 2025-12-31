from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config
from database import db
from models import *
from auth import auth_bp
from protected import protected_bp

app = Flask(__name__)
app.config.from_object(Config)

# ✅ ENABLE CORS (Required for GitHub Pages frontend)
CORS(app)

# ✅ Initialize DB & JWT
db.init_app(app)
jwt = JWTManager(app)

# ✅ Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(protected_bp, url_prefix='/api')

# ✅ Health Check Route
@app.route('/')
def home():
    return {"message": "Authentication & Role Based APIs Running"}

# ✅ Create tables once (safe for student project)
with app.app_context():
    db.create_all()

# ❌ DO NOT USE debug=True IN PRODUCTION
# ❌ DO NOT call app.run() for Render
