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
            "duration": c.duration,
            "assignment_limit": c.assignment_limit,
            "quiz_limit": c.quiz_limit
        })

    internship_list = []
    for i in internships:
        # Assuming Task model tracks assigned_to for interns
        # For simple parity, we just show the internship name and duration
        internship_list.append({
            "internship_id": i.id,
            "intern_name": i.intern_name,
            "duration": i.duration,
            "assignment_limit": i.assignment_limit
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

    course = Course.query.get_or_404(data["course_id"])

    current_count = Assignment.query.filter_by(course_id=course.id).count()

    # ✅ Enforce trainer-defined limit (if set)
    if course.assignment_limit is not None and current_count >= course.assignment_limit:
        return jsonify({"error": f"Limit reached! You set a maximum of {course.assignment_limit} assignment(s) for this course."}), 400

    # ✅ AUTO-CALCULATE WEEK
    week_num = current_count + 1

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
    return jsonify({"message": "Assignment assigned", "assignment_limit": course.assignment_limit}), 201


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
            "file_url": s.file_path.replace("\\", "/") if s.file_path else "",
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
            "file_url": s.file_path.replace("\\", "/") if s.file_path else "",
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
        url=path.replace("\\", "/")
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
        "url": r.url.replace("\\", "/") if r.url else ""
    } for r in resources])


# ================= DELETE RESOURCE =================
@trainer_bp.route("/trainer/resource/<int:resource_id>", methods=["DELETE"])
@jwt_required()
def delete_resource(resource_id):
    resource = CourseResource.query.get_or_404(resource_id)
    db.session.delete(resource)
    db.session.commit()
    return jsonify({"message": "Resource deleted successfully"}), 200


# ================= COURSE SETTINGS =================
@trainer_bp.route("/trainer/course/<int:course_id>/settings", methods=["GET", "POST"])
@jwt_required()
def course_settings(course_id):
    course = Course.query.get_or_404(course_id)
    
    if request.method == "POST":
        data = request.get_json()
        
        # ✅ Set Once Logic for Assignment Limit
        if "assignment_limit" in data and course.assignment_limit is None:
            try:
                val = int(data["assignment_limit"])
                course.assignment_limit = val if val >= 0 else None
            except: course.assignment_limit = None
            
        # ✅ Set Once Logic for Quiz Limit
        if "quiz_limit" in data and course.quiz_limit is None:
            try:
                val = int(data["quiz_limit"])
                course.quiz_limit = val if val >= 0 else None
            except: course.quiz_limit = None
            
        db.session.commit()
        return jsonify({"message": "Settings updated", "assignment_limit": course.assignment_limit, "quiz_limit": course.quiz_limit})

    return jsonify({
        "assignment_limit": course.assignment_limit,
        "quiz_limit": course.quiz_limit
    })


# ================= INTERNSHIP TASKS =================
@trainer_bp.route("/trainer/internship/<int:internship_id>/tasks", methods=["GET"])
@jwt_required()
def get_internship_tasks(internship_id):
    tasks = Task.query.filter_by(internship_id=internship_id).all()
    
    # Filter for unique "templates" (Title + Week)
    unique_map = {}
    for t in tasks:
        key = (t.title, t.week_number)
        if key not in unique_map:
            unique_map[key] = t # Keep first instance as the representative
            
    unique_tasks = list(unique_map.values())
    
    return jsonify([{
        "id": t.id, # This ID is just a proxy for the 'template'
        "title": t.title,
        "week_number": t.week_number,
        "due_date": t.due_date
    } for t in sorted(unique_tasks, key=lambda x: (x.week_number, x.due_date or ""))])

@trainer_bp.route("/trainer/internship/<int:internship_id>/settings", methods=["GET", "POST"])
@jwt_required()
def internship_settings(internship_id):
    internship = Internship.query.get_or_404(internship_id)
    
    if request.method == "POST":
        data = request.get_json()
        
        # ✅ Set Once Logic for Assignment Limit
        if "assignment_limit" in data and internship.assignment_limit is None:
            try:
                val = int(data["assignment_limit"])
                internship.assignment_limit = val if val >= 0 else None
            except: internship.assignment_limit = None
            
        db.session.commit()
        return jsonify({"message": "Internship settings updated", "assignment_limit": internship.assignment_limit})

    return jsonify({
        "assignment_limit": internship.assignment_limit
    })

@trainer_bp.route("/trainer/internship/assign", methods=["POST"])
@jwt_required()
def assign_intern_task():
    data = request.get_json()
    internship = Internship.query.get_or_404(data["internship_id"])
    
    # Count UNIQUE weeks or task rounds to prevent limit block
    unique_weeks = db.session.query(Task.week_number).filter_by(internship_id=internship.id).distinct().count()

    # ✅ Enforce trainer-defined limit (if set)
    if internship.assignment_limit is not None:
        if unique_weeks >= internship.assignment_limit:
            return jsonify({"error": f"Limit reached! You set a maximum of {internship.assignment_limit} task(s) for this internship."}), 400
    else:
        # Fallback to duration-based limit if no manual limit is set
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
            
        if unique_weeks >= max_tasks:
            return jsonify({"error": f"Limit reached! This is a {internship.duration} internship (Max {max_tasks} tasks/weeks)."}), 400
        
    week_num = unique_weeks + 1
    
    # Create the task for ALL enrolled interns
    enrollments = Enrollment.query.filter_by(internship_id=internship.id).all()
    
    tasks_created = 0
    
    if not enrollments:
        # If no one enrolled, maybe assign to trainer as a template? 
        # But for now, let's just log it or assign to self if really needed.
        # User request implies visibility for interns.
        pass
        
    for enrollment in enrollments:
        task = Task(
            title=data["title"],
            due_date=data["due_date"],
            week_number=week_num,
            internship_id=internship.id,
            assigned_by=get_jwt_identity(),
            assigned_to=enrollment.user_id 
        )
        db.session.add(task)
        tasks_created += 1

    if tasks_created == 0:
        # Fallback: Create one for the trainer so it appears in the dashboard
        # This acts as a "Template" task
        task = Task(
            title=data["title"],
            due_date=data["due_date"],
            week_number=week_num,
            internship_id=internship.id,
            assigned_by=get_jwt_identity(),
            assigned_to=get_jwt_identity() # Assign to self (Trainer)
        )
        db.session.add(task)
        pass
        
    db.session.commit()
    return jsonify({"message": "Task assigned"}), 201

@trainer_bp.route("/trainer/task/<int:task_id>", methods=["PUT"])
@jwt_required()
def update_intern_task(task_id):
    data = request.get_json()
    # Find the 'template' task
    template_task = Task.query.get_or_404(task_id)
    
    # Find all tasks that match this template (Same Internship, Title, Week)
    # We update ALL of them to keep them in sync
    sisters = Task.query.filter_by(
        internship_id=template_task.internship_id,
        title=template_task.title, 
        week_number=template_task.week_number
    ).all()
    
    for t in sisters:
        if "title" in data: t.title = data["title"]
        if "due_date" in data: t.due_date = data["due_date"]
        
    db.session.commit()
    return jsonify({"message": f"Updated {len(sisters)} tasks"}), 200

@trainer_bp.route("/trainer/task/<int:task_id>", methods=["DELETE"])
@jwt_required()
def delete_intern_task(task_id):
    template_task = Task.query.get_or_404(task_id)
    
    # Find all sister tasks to delete
    sisters = Task.query.filter_by(
        internship_id=template_task.internship_id,
        title=template_task.title, 
        week_number=template_task.week_number
    ).all()
    
    count = 0
    for t in sisters:
        # Manually delete submissions first due to missing cascade
        TaskSubmission.query.filter_by(task_id=t.id).delete()
        db.session.delete(t)
        count += 1
    
    db.session.commit()
    return jsonify({"message": f"Deleted {count} tasks"}), 200

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
            "student_id": s.student_id,
            "task_id": s.task_id,
            "student_name": student.name if student else "Unknown",
            "task_title": task.title if task else "Unknown",
            "file_url": s.file_path.replace("\\", "/") if s.file_path else "",
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
    if "feedback" in data: submission.feedback = data["feedback"]
    if "grade" in data: submission.grade = data["grade"]
    if "status" in data: 
        submission.status = data["status"] # Allow status update
        
        # ✅ Sync with Task Status
        task = Task.query.get(submission.task_id)
        if task:
            task.status = data["status"]


    db.session.commit()
    return jsonify({"message": "Task Submission updated", "status": submission.status})


# ================= INTERNSHIP RESOURCES =================
# @trainer_bp.route("/trainer/internship/<int:internship_id>/resource/upload", methods=["POST"])
# @jwt_required()
# def upload_internship_resource(internship_id):
#     return jsonify({"error": "Resource upload disabled"}), 403

# @trainer_bp.route("/trainer/internship/<int:internship_id>/resources", methods=["GET"])
# @jwt_required()
# def get_internship_resources(internship_id):
#     return jsonify([]), 200

# @trainer_bp.route("/trainer/internship/resource/<int:resource_id>", methods=["DELETE"])
# @jwt_required()
# def delete_internship_resource(resource_id):
#     return jsonify({"error": "Disabled"}), 403

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

    # ✅ Enforce trainer-defined limit (if set)
    current_count = Quiz.query.filter_by(course_id=course.id).count()
    if course.quiz_limit is not None and current_count >= course.quiz_limit:
        return jsonify({"error": f"Limit reached! You set a maximum of {course.quiz_limit} quiz(zes) for this course."}), 400

    week_num = current_count + 1

    quiz = Quiz(
        course_id=data["course_id"],
        title=data["title"],
        week_number=week_num,
        deadline=data["deadline"]
    )
    db.session.add(quiz)
    db.session.flush()  # Get quiz id

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

# ================= AI QUIZ IMPORT =================
@trainer_bp.route("/trainer/quiz/import-ai", methods=["POST"])
@jwt_required()
def import_quiz_ai():
    from ai_importer import fetch_content_from_url, parse_quiz_with_ai, extract_text_from_pdf
    
    # Handle both JSON and Form data (for file uploads)
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    url = data.get("url")
    file = request.files.get("file")
    course_id = data.get("course_id")
    title = data.get("title")
    deadline = data.get("deadline")
    
    if not title or not deadline:
        return jsonify({"error": "Title and Deadline are required"}), 400

    # ✅ Early Limit Check
    course = Course.query.get_or_404(course_id)
    current_count = Quiz.query.filter_by(course_id=course.id).count()
    if course.quiz_limit is not None and current_count >= course.quiz_limit:
        return jsonify({"error": f"Limit reached! You set a maximum of {course.quiz_limit} quiz(zes) for this course."}), 400

    content = ""

    # 1. Get Content (File or URL)
    if file:
        content = extract_text_from_pdf(file)
        if not content:
            return jsonify({"error": "Could not extract text from PDF"}), 400
    elif url:
        content = fetch_content_from_url(url)
        if not content:
            return jsonify({"error": "Could not fetch content from link"}), 400
    else:
        return jsonify({"error": "Please provide either a Link or a PDF file"}), 400
    
    # 2. Parse with AI
    questions_data = parse_quiz_with_ai(content)
    
    if isinstance(questions_data, dict) and "error" in questions_data:
        return jsonify({"error": f"AI Parsing failed: {questions_data['error']}"}), 500

    # 3. Save to Database
    # course = Course.query.get_or_404(course_id) # Already fetched above
    week_num = current_count + 1

    quiz = Quiz(
        course_id=course_id,
        title=title,
        week_number=week_num,
        deadline=deadline
    )
    db.session.add(quiz)
    db.session.flush()

    for q_data in questions_data:
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
    
    return jsonify({
        "message": "Quiz successfully imported with AI!",
        "quiz_id": quiz.id,
        "question_count": len(questions_data)
    }), 201
