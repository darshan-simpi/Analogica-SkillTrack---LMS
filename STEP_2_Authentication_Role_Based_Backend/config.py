class Config:
    SECRET_KEY = "major_project_secret"
    JWT_SECRET_KEY = "jwt-secret-key"

    SQLALCHEMY_DATABASE_URI = "sqlite:///lms.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True

    MAIL_USERNAME = "darshansimpi64@gmail.com"
    MAIL_PASSWORD = "ezua hvii pjox qiwu"
    MAIL_DEFAULT_SENDER = ("Analogica SkillTrack", "darshansimpi64@gmail.com")

    FRONTEND_URL = "https://darshan-simpi.github.io/Analogica-SkillTrack---LMS"
