class Config:
    SECRET_KEY = "major_project_secret"
    JWT_SECRET_KEY = "jwt-secret-key"

    SQLALCHEMY_DATABASE_URI = "mysql+pymysql://root:@localhost/darshan"

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ================= EMAIL CONFIG =================
    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False

    MAIL_USERNAME = "darshansimpi64@gmail.com"
    MAIL_PASSWORD = "ezua hvii pjox qiwu"
    MAIL_DEFAULT_SENDER = MAIL_USERNAME

    # Frontend (GitHub Pages)
    FRONTEND_URL = "https://darshan-simpi.github.io/Analogica-SkillTrack---LMS"
