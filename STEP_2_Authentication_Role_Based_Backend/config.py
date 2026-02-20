class Config:
    # ================= FLASK =================
    SECRET_KEY = "major_project_secret"

    # ================= JWT (🔥 CRITICAL FOR 422 FIX) =================
    JWT_SECRET_KEY = "jwt-secret-key"
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # ================= DATABASE =================
    SQLALCHEMY_DATABASE_URI = "mysql+pymysql://root:@127.0.0.1/skilltrack"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ================= EMAIL CONFIG =================
    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False

    MAIL_USERNAME = "darshansimpi64@gmail.com"
    MAIL_PASSWORD = "ezua hvii pjox qiwu"
    MAIL_DEFAULT_SENDER = MAIL_USERNAME

    # ================= FRONTEND =================
    FRONTEND_URL = "https://darshan-simpi.github.io/Analogica-SkillTrack---LMS"
