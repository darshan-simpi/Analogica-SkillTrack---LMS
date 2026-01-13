from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Course, Enrollment, Assignment, Submission, User, CourseResource, StudentProgress, Internship, Task, TaskSubmission, InternshipResource, Quiz, Question, QuizSubmission
from extensions import db
from werkzeug.utils import secure_filename
import os

trainer_bp = Blueprint("trainer", __name__)

# ================= TRAINER DASHBOARD =================
@trainer_bp.route("/trainer/dashboard", methods=["GET"])
@jwt_required()
def trainer_dashboard():
    trainer_id = get_jwt_identity()
    trainer = User.query.get(trainer_id)

    if not trainer or trainer.role != "TRAINER":
        return jsonify({"error": "Unauthorized"}), 403

    courses = Course.query.filter_by(mentor_name=trainer.name).all()
    internships = Internship.query.filter_by(mentor_name=trainer.name).all()

    course_list = []
    for c in courses:
        students = Enrollment.query.filter_by(course_id=c.id).count()
        course_list.append({
            "course_id": c.id,
            "course_name": c.name,
            "students": students,
            "duration": c.duration
        })

    internship_list = []
    for i in internships:
        # Assuming Task model tracks assigned_to for interns
        # For simple parity, we just show the internship name and duration
        internship_list.append({
            "internship_id": i.id,
            "intern_name": i.intern_name,
            "duration": i.duration
        })

    return jsonify({
        "courses": course_list,
        "internships": internship_list
    }), 200


# ================= INTERNSHIP TASKS =================

# ================= ASSIGN ASSIGNMENT =================


# ================= ASSIGN ASSIGNMENT =================
@trainer_bp.route("/trainer/assign", methods=["POST"])
@jwt_required()
def assign_assignment():
    data = request.get_json()

    course = Course.query.get_or_404(data["course_id"])
    
    # 🔍 ROBUST DURATION PARSING
    max_assignments = 4 # Fallback
    try:
        duration_str = course.duration.lower()
        # Extract number (e.g., "1 week" -> 1, "2 Months" -> 2)
        import re
        match = re.search(r'(\d+)', duration_str)
        num = int(match.group(1)) if match else 1
        
        if "month" in duration_str:
            max_assignments = num * 4
        elif "week" in duration_str:
            max_assignments = num
    except Exception:
        pass # Keep fallback 4 if parsing fails
        
    # Check 1: Count Limit
    current_count = Assignment.query.filter_by(course_id=course.id).count()
    if current_count >= max_assignments:
        return jsonify({"error": f"Limit reached! This is a {course.duration} course (Max {max_assignments} assignments)."}), 400
        
    # ✅ AUTO-CALCULATE WEEK
    week_num = current_count + 1
    
    # Check 2: Week Limit
    if week_num > max_assignments:
        return jsonify({"error": f"Cannot add Week {week_num}! Max week for {course.duration} course is {max_assignments}."}), 400

    assignment = Assignment(
        course_id=data["course_id"],
        title=data["title"],
        week_number=week_num,
        due_date=data["due_date"],
        is_released=True
    )
    db.session.add(assignment)

    students = StudentProgress.query.filter_by(course_id=data["course_id"]).all()
    for s in students:
        s.total_assignments += 1

    db.session.commit()
    return jsonify({"message": "Assignment assigned"}), 201


# ================= COURSE ASSIGNMENTS =================
@trainer_bp.route("/trainer/course/<int:course_id>/assignments", methods=["GET"])
@jwt_required()
def get_course_assignments(course_id):
    assignments = Assignment.query.filter_by(course_id=course_id).all()

    return jsonify([{
        "id": a.id,
        "title": a.title,
        "week_number": a.week_number,
        "due_date": a.due_date
    } for a in sorted(assignments, key=lambda x: (x.week_number, x.due_date or ""))])


# ================= EDIT ASSIGNMENT =================
@trainer_bp.route("/trainer/assignment/<int:assignment_id>", methods=["PUT"])
@jwt_required()
def update_assignment(assignment_id):
    data = request.get_json()
    assignment = Assignment.query.get_or_404(assignment_id)

    if "title" in data:
        assignment.title = data["title"]
    if "week_number" in data:
        assignment.week_number = data["week_number"]
    if "due_date" in data:
        assignment.due_date = data["due_date"]

    db.session.commit()
    return jsonify({"message": "Assignment updated successfully"}), 200


# ================= DELETE ASSIGNMENT =================
@trainer_bp.route("/trainer/assignment/<int:assignment_id>", methods=["DELETE"])
@jwt_required()
def delete_assignment(assignment_id):
    assignment = Assignment.query.get_or_404(assignment_id)
    
    # Optional: Delete associated submissions manually if cascade isn't set
    # (Assuming we want to clean up)
    Submission.query.filter_by(assignment_id=assignment_id).delete()
    
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({"message": "Assignment deleted successfully"}), 200


# ================= SUBMISSIONS =================
@trainer_bp.route("/trainer/assignment/<int:assignment_id>/submissions", methods=["GET"])
@jwt_required()
def get_submissions(assignment_id):
    submissions = Submission.query.filter_by(assignment_id=assignment_id).all()

    result = []
    for s in submissions:
        student = User.query.get(s.student_id)

        result.append({
            "submission_id": s.id,
            "student_name": student.name if student else "Unknown",
            "file_url": s.file_path,
            "feedback": s.feedback,
            "grade": s.grade,
            "status": s.status
        })

    return jsonify(result), 200

# ================= COURSE SUBMISSIONS =================
@trainer_bp.route("/trainer/course/<int:course_id>/submissions", methods=["GET"])
@jwt_required()
def get_course_submissions(course_id):
    assignments = Assignment.query.filter_by(course_id=course_id).all()
    assignment_ids = [a.id for a in assignments]
    
    submissions = Submission.query.filter(Submission.assignment_id.in_(assignment_ids)).all()

    result = []
    for s in submissions:
        student = User.query.get(s.student_id)
        assignment = Assignment.query.get(s.assignment_id)

        result.append({
            "submission_id": s.id,
            "student_name": student.name if student else "Unknown",
            "assignment_title": assignment.title if assignment else "Unknown",
            "file_url": s.file_path,
            "feedback": s.feedback,
            "grade": s.grade,
            "status": s.status
        })

    return jsonify(result), 200

# ================= UPDATE SUBMISSION (GRADE, FEEDBACK, STATUS) =================
@trainer_bp.route("/trainer/submission/update", methods=["POST"])
@jwt_required()
def update_submission():
    data = request.get_json()
    submission = Submission.query.get_or_404(data["submission_id"])
    
    # Update fields if provided
    if "feedback" in data:
        submission.feedback = data["feedback"]
    if "grade" in data:
        submission.grade = data["grade"]
    
    old_status = submission.status
    if "status" in data:
        submission.status = data["status"]
        
        # Logic regarding progress update on approval is removed to prevent double counting
        # Progress is calculated in student_api.py based on unique submissions


    db.session.commit()
    return jsonify({"message": "Submission updated successfully", "status": submission.status})

# ================= FEEDBACK =================
@trainer_bp.route("/trainer/feedback", methods=["POST"])
@jwt_required()
def give_feedback():
    data = request.get_json()
    submission = Submission.query.get_or_404(data["submission_id"])
    submission.feedback = data["feedback"]
    db.session.commit()
    return jsonify({"message": "Feedback saved"})


# ================= RESOURCE UPLOAD =================
@trainer_bp.route("/trainer/course/<int:course_id>/resource/upload", methods=["POST"])
@jwt_required()
def upload_resource(course_id):
    file = request.files.get("file")
    title = request.form.get("title")

    if not file:
        return jsonify({"error": "File required"}), 400

    os.makedirs("uploads/resources", exist_ok=True)
    filename = secure_filename(file.filename)
    path = f"uploads/resources/{filename}"
    file.save(path)

    resource = CourseResource(
        course_id=course_id,
        title=title,
        type=file.content_type,
        url=path
    )

    db.session.add(resource)
    db.session.commit()
    return jsonify({"message": "Resource uploaded"}), 201


# ================= GET RESOURCES =================
@trainer_bp.route("/trainer/course/<int:course_id>/resources", methods=["GET"])
@jwt_required()
def get_resources(course_id):
    resources = CourseResource.query.filter_by(course_id=course_id).all()

    return jsonify([{
        "id": r.id,
        "title": r.title,
        "type": r.type,
        "url": r.url
    } for r in resources])


# ================= DELETE RESOURCE =================
@trainer_bp.route("/trainer/resource/<int:resource_id>", methods=["DELETE"])
@jwt_required()
def delete_resource(resource_id):
    resource = CourseResource.query.get_or_404(resource_id)
    db.session.delete(resource)
    db.session.commit()
# ================= INTERNSHIP TASKS =================
@trainer_bp.route("/trainer/internship/<int:internship_id>/tasks", methods=["GET"])
@jwt_required()
def get_internship_tasks(internship_id):
    tasks = Task.query.filter_by(internship_id=internship_id).all()
    return jsonify([{
        "id": t.id,
        "title": t.title,
        "week_number": t.week_number,
        "due_date": t.due_date
    } for t in sorted(tasks, key=lambda x: (x.week_number, x.due_date or ""))])

@trainer_bp.route("/trainer/internship/assign", methods=["POST"])
@jwt_required()
def assign_intern_task():
    data = request.get_json()
    internship = Internship.query.get_or_404(data["internship_id"])
    
    # 🔍 ROBUST DURATION PARSING
    max_tasks = 4 # Fallback
    try:
        duration_str = internship.duration.lower()
        import re
        match = re.search(r'(\d+)', duration_str)
        num = int(match.group(1)) if match else 1
        
        if "month" in duration_str:
            max_tasks = num * 4
        elif "week" in duration_str:
            max_tasks = num
    except Exception:
        pass
        
    current_count = Task.query.filter_by(internship_id=internship.id).count()
    if current_count >= max_tasks:
        return jsonify({"error": f"Limit reached! This is a {internship.duration} internship (Max {max_tasks} tasks)."}), 400
        
    week_num = current_count + 1
    
    # Create the task
    # We need to know WHO to assign it to. 
    # Usually, an Internship record should probably have an intern_id, but the current model just has intern_name.
    # We'll try to find a user with that name and role INTERN.
    intern = User.query.filter_by(name=internship.intern_name, role="INTERN").first()
    
    task = Task(
        title=data["title"],
        due_date=data["due_date"],
        week_number=week_num,
        internship_id=internship.id,
        assigned_by=get_jwt_identity(),
        assigned_to=intern.id if intern else get_jwt_identity() # Fallback
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({"message": "Task assigned"}), 201

@trainer_bp.route("/trainer/task/<int:task_id>", methods=["PUT"])
@jwt_required()
def update_intern_task(task_id):
    data = request.get_json()
    task = Task.query.get_or_404(task_id)
    if "title" in data: task.title = data["title"]
    if "due_date" in data: task.due_date = data["due_date"]
    db.session.commit()
    return jsonify({"message": "Task updated"}), 200

@trainer_bp.route("/trainer/task/<int:task_id>", methods=["DELETE"])
@jwt_required()
def delete_intern_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted"}), 200

# ================= INTERNSHIP SUBMISSIONS =================
@trainer_bp.route("/trainer/internship/<int:internship_id>/submissions", methods=["GET"])
@jwt_required()
def get_internship_submissions(internship_id):
    tasks = Task.query.filter_by(internship_id=internship_id).all()
    task_ids = [t.id for t in tasks]
    
    submissions = TaskSubmission.query.filter(TaskSubmission.task_id.in_(task_ids)).all()

    result = []
    for s in submissions:
        student = User.query.get(s.student_id)
        task = Task.query.get(s.task_id)

        result.append({
            "submission_id": s.id,
            "student_name": student.name if student else "Unknown",
            "task_title": task.title if task else "Unknown",
            "file_url": s.file_path,
            "feedback": s.feedback,
            "grade": s.grade,
            "status": s.status
        })

    return jsonify(result), 200

@trainer_bp.route("/trainer/task_submission/update", methods=["POST"])
@jwt_required()
def update_task_submission():
    data = request.get_json()
    submission = TaskSubmission.query.get_or_404(data["submission_id"])
    
    if "feedback" in data: submission.feedback = data["feedback"]
    if "grade" in data: submission.grade = data["grade"]
    if "status" in data: submission.status = data["status"]

    db.session.commit()
    return jsonify({"message": "Task Submission updated", "status": submission.status})


# ================= INTERNSHIP RESOURCES =================
@trainer_bp.route("/trainer/internship/<int:internship_id>/resource/upload", methods=["POST"])
@jwt_required()
def upload_internship_resource(internship_id):
    file = request.files.get("file")
    title = request.form.get("title")

    if not file: return jsonify({"error": "File required"}), 400

    os.makedirs("uploads/resources", exist_ok=True)
    filename = secure_filename(file.filename)
    path = f"uploads/resources/{filename}"
    file.save(path)

    resource = InternshipResource(
        internship_id=internship_id,
        title=title,
        type=file.content_type,
        url=path
    )

    db.session.add(resource)
    db.session.commit()
    return jsonify({"message": "Resource uploaded"}), 201

@trainer_bp.route("/trainer/internship/<int:internship_id>/resources", methods=["GET"])
@jwt_required()
def get_internship_resources(internship_id):
    resources = InternshipResource.query.filter_by(internship_id=internship_id).all()
    return jsonify([{
        "id": r.id,
        "title": r.title,
        "type": r.type,
        "url": r.url
    } for r in resources])

@trainer_bp.route("/trainer/internship/resource/<int:resource_id>", methods=["DELETE"])
@jwt_required()
def delete_internship_resource(resource_id):
    resource = InternshipResource.query.get_or_404(resource_id)
    db.session.delete(resource)
    db.session.commit()
    return jsonify({"message": "Resource deleted"}), 200

# ================= QUIZ MANAGEMENT =================
@trainer_bp.route("/trainer/course/<int:course_id>/quizzes", methods=["GET"])
@jwt_required()
def get_course_quizzes(course_id):
    quizzes = Quiz.query.filter_by(course_id=course_id).all()
    result = []
    for q in quizzes:
        result.append({
            "id": q.id,
            "title": q.title,
            "week_number": q.week_number,
            "deadline": q.deadline,
            "question_count": len(q.questions)
        })
    return jsonify(sorted(result, key=lambda x: x["week_number"])), 200

@trainer_bp.route("/trainer/quiz/assign", methods=["POST"])
@jwt_required()
def assign_quiz():
    data = request.get_json()
    course = Course.query.get_or_404(data["course_id"])
    
    # 🔍 DURATION BASED LIMIT (Similar to assignments)
    max_quizzes = 4
    try:
        duration_str = course.duration.lower()
        import re
        match = re.search(r'(\d+)', duration_str)
        num = int(match.group(1)) if match else 1
        if "month" in duration_str: max_quizzes = num * 4
        elif "week" in duration_str: max_quizzes = num
    except: pass

    current_count = Quiz.query.filter_by(course_id=course.id).count()
    if current_count >= max_quizzes:
        return jsonify({"error": f"Limit reached! Max {max_quizzes} quizzes for this course."}), 400

    week_num = current_count + 1

    quiz = Quiz(
        course_id=data["course_id"],
        title=data["title"],
        week_number=week_num,
        deadline=data["deadline"]
    )
    db.session.add(quiz)
    db.session.flush() # Get quiz id

    # Add questions
    for q_data in data.get("questions", []):
        question = Question(
            quiz_id=quiz.id,
            text=q_data["text"],
            option_a=q_data["option_a"],
            option_b=q_data["option_b"],
            option_c=q_data["option_c"],
            option_d=q_data["option_d"],
            correct_answer=q_data["correct_answer"]
        )
        db.session.add(question)

    db.session.commit()
    return jsonify({"message": "Quiz assigned successfully"}), 201

@trainer_bp.route("/trainer/quiz/<int:quiz_id>", methods=["DELETE"])
@jwt_required()
def delete_quiz(quiz_id):
    quiz = Quiz.query.get_or_404(quiz_id)
    db.session.delete(quiz)
    db.session.commit()
    return jsonify({"message": "Quiz deleted"}), 200

@trainer_bp.route("/trainer/quiz/<int:quiz_id>/results", methods=["GET"])
@jwt_required()
def get_quiz_results(quiz_id):
    submissions = QuizSubmission.query.filter_by(quiz_id=quiz_id).all()
    result = []
    for s in submissions:
        student = User.query.get(s.student_id)
        result.append({
            "student_name": student.name if student else "Unknown",
            "score": s.score,
            "total": s.total_questions,
            "submitted_at": s.submitted_at.strftime("%Y-%m-%d %H:%M")
        })
    return jsonify(result), 200