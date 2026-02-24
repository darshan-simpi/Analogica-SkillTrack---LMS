from extensions import db
from datetime import datetime

# ================= USERS =================
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ✅ NEW: Study Streak Logic
    last_activity_date = db.Column(db.Date, nullable=True) # Will store just YYYY-MM-DD
    current_streak = db.Column(db.Integer, default=0)

    enrollments = db.relationship("Enrollment", backref="user", lazy=True)

    def __repr__(self):
        return f"<User {self.email}>"

# ================= COURSES =================
class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)

    start_date = db.Column(db.String(50), nullable=False)

    # ✅ NEW FIELDS
    mentor_name = db.Column(db.String(100), nullable=False)
    duration = db.Column(db.String(50), nullable=False)
    assignment_limit = db.Column(db.Integer, nullable=True)  # Trainer-defined limit (None = unlimited)
    quiz_limit = db.Column(db.Integer, nullable=True)  # Trainer-defined limit (None = unlimited)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    assignments = db.relationship("Assignment", backref="course", lazy=True)
    enrollments = db.relationship("Enrollment", backref="course", lazy=True)

# ================= ENROLLMENTS =================
class Enrollment(db.Model):
    __tablename__ = "enrollments"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("courses.id"),
        nullable=True
    )

    internship_id = db.Column(
        db.Integer,
        db.ForeignKey("internships.id"),
        nullable=True
    )

    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)

# ================= STUDENT PROGRESS =================
class StudentProgress(db.Model):
    __tablename__ = "student_progress"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("courses.id"),
        nullable=False
    )

    progress = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default="On Track")

    assignments_completed = db.Column(db.Integer, default=0)
    total_assignments = db.Column(db.Integer, default=0)

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

# ================= WORKSHOPS =================
class Workshop(db.Model):
    __tablename__ = "workshops"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150))
    trainer_name = db.Column(db.String(100))
    location = db.Column(db.String(150))      # ✅ NEW
    start_date = db.Column(db.String(50))     # ✅ NEW (Renamed from date)
    end_date = db.Column(db.String(50))       # ✅ NEW

# ================= INTERNSHIPS =================
class Internship(db.Model):
    __tablename__ = "internships"

    id = db.Column(db.Integer, primary_key=True)
    intern_name = db.Column(db.String(100))
    mentor_name = db.Column(db.String(100))
    duration = db.Column(db.String(50))
    assignment_limit = db.Column(db.Integer, nullable=True)  # Trainer-defined limit

    tasks = db.relationship("Task", backref="internship", lazy=True)
    enrollments = db.relationship("Enrollment", backref="internship", lazy=True)

# ================= TASKS (INTERNSHIP TASKS) =================
class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)

    assigned_to = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    assigned_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    internship_id = db.Column(
        db.Integer,
        db.ForeignKey("internships.id"),
        nullable=True
    )

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("courses.id"),
        nullable=True
    )

    status = db.Column(db.String(50), default="Pending")
    priority = db.Column(db.String(20), default="Medium")
    week_number = db.Column(db.Integer, default=1)   # ✅ Added for parity with Assignments
    due_date = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ================= ASSIGNMENTS (COURSE WORK) =================
class Assignment(db.Model):
    __tablename__ = "assignments"

    id = db.Column(db.Integer, primary_key=True)

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("courses.id"),
        nullable=False
    )

    title = db.Column(db.String(150), nullable=False)
    week_number = db.Column(db.Integer, default=1)   # ✅ Added week number
    due_date = db.Column(db.String(50))
    is_released = db.Column(db.Boolean, default=False) # ✅ Added is_released
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    submissions = db.relationship("Submission", backref="assignment", lazy=True)

# ================= SUBMISSIONS =================
# ================= SUBMISSIONS =================
class Submission(db.Model):
    __tablename__ = "submissions"

    id = db.Column(db.Integer, primary_key=True)

    assignment_id = db.Column(
        db.Integer,
        db.ForeignKey("assignments.id"),
        nullable=False
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    file_path = db.Column(db.String(255))
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    feedback = db.Column(db.String(255))
    status = db.Column(db.String(50), default="Pending")
    grade = db.Column(db.String(50))

# ================= TASK SUBMISSIONS (INTERNSHIPS) =================
class TaskSubmission(db.Model):
    __tablename__ = "task_submissions"

    id = db.Column(db.Integer, primary_key=True)

    task_id = db.Column(
        db.Integer,
        db.ForeignKey("tasks.id"),
        nullable=False
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    file_path = db.Column(db.String(255))
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    feedback = db.Column(db.String(255))
    status = db.Column(db.String(50), default="Pending")
    grade = db.Column(db.String(50))


# ================= COURSE RESOURCES =================
class CourseResource(db.Model):
    __tablename__ = "course_resources"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    type = db.Column(db.String(50))  # 'book', 'youtube', 'article'
    url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ================= INTERNSHIP RESOURCES =================
class InternshipResource(db.Model):
    __tablename__ = "internship_resources"

    id = db.Column(db.Integer, primary_key=True)
    internship_id = db.Column(db.Integer, db.ForeignKey("internships.id"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    type = db.Column(db.String(50))
    url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ================= CERTIFICATES =================
class Certificate(db.Model):
    __tablename__ = "certificates"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    certificate_url = db.Column(db.String(255))
    issued_at = db.Column(db.DateTime, default=datetime.utcnow)

# ================= QUIZZES =================
class Quiz(db.Model):
    __tablename__ = "quizzes"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    week_number = db.Column(db.Integer, default=1)
    deadline = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    questions = db.relationship("Question", backref="quiz", lazy=True, cascade="all, delete-orphan")
    submissions = db.relationship("QuizSubmission", backref="quiz", lazy=True, cascade="all, delete-orphan")

class Question(db.Model):
    __tablename__ = "questions"

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey("quizzes.id"), nullable=False)
    text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(200), nullable=False)
    option_b = db.Column(db.String(200), nullable=False)
    option_c = db.Column(db.String(200), nullable=False)
    option_d = db.Column(db.String(200), nullable=False)
    correct_answer = db.Column(db.String(1), nullable=False) # 'A', 'B', 'C', or 'D'

class QuizSubmission(db.Model):
    __tablename__ = "quiz_submissions"

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey("quizzes.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)