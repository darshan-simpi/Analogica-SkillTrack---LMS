class Config:
    SECRET_KEY = "major_project_secret"
    SQLALCHEMY_DATABASE_URI = "sqlite:///lms.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "jwt-secret-key"
