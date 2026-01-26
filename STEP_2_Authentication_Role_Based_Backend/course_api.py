from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from datetime import datetime
from extensions import db
from models import Course, Workshop, Internship, User, Task, Submission, Enrollment, StudentProgress, TaskSubmission
from utils import allowed_file

course_bp = Blueprint("course_api", __name__)

# ================= COURSES =================

@course_bp.route("/courses", methods=["GET"])
def get_courses():
    courses = Course.query.all()
    return jsonify([
        {
            "id": c.id,
            "name": c.name,
            "date": c.start_date,
            "mentor_name": c.mentor_name,
            "duration": c.duration
        }
        for c in courses
    ]), 200


@course_bp.route("/courses", methods=["POST"])
@jwt_required()
def add_course():
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()

    course = Course(
        name=data.get("name"),
        start_date=data.get("date"),
        mentor_name=data.get("mentor_name"),  # ✅
        duration=data.get("duration")         # ✅
    )

    db.session.add(course)
    db.session.commit()
    return jsonify({"message": "Course added"}), 201


@course_bp.route("/courses/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_course(id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    course = Course.query.get_or_404(id)

    # ✅ MANUAL CASCADE DELETE
    # 1. Enrollments
    Enrollment.query.filter_by(course_id=id).delete()
    
    # 2. Student Progress
    StudentProgress.query.filter_by(course_id=id).delete()
    
    # 3. Certificates
    Certificate.query.filter_by(course_id=id).delete()
    
    # 4. Assignments & Submissions
    assignments = Assignment.query.filter_by(course_id=id).all()
    for a in assignments:
        Submission.query.filter_by(assignment_id=a.id).delete()
        db.session.delete(a)
        
    # 5. Quizzes & Submissions
    quizzes = Quiz.query.filter_by(course_id=id).all()
    for q in quizzes:
        QuizSubmission.query.filter_by(quiz_id=q.id).delete()
        # Questions cascade automatically via relationship usually, but let's be safe if not
        # Question.query.filter_by(quiz_id=q.id).delete() 
        db.session.delete(q)

    # 6. Resources
    CourseResource.query.filter_by(course_id=id).delete()

    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course and all related data deleted"}), 200


@course_bp.route("/courses/<int:id>", methods=["PUT"])
@jwt_required()
def edit_course(id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    course = Course.query.get_or_404(id)
    data = request.get_json()

    course.name = data.get("name", course.name)
    course.start_date = data.get("date", course.start_date)
    course.mentor_name = data.get("mentor_name", course.mentor_name)
    course.duration = data.get("duration", course.duration)

    db.session.commit()
    return jsonify({"message": "Course updated"}), 200


# ================= WORKSHOPS =================

@course_bp.route("/workshops", methods=["GET"])
def get_workshops():
    workshops = Workshop.query.all()
    return jsonify([
        {
            "id": w.id,
            "title": w.title,
            "trainer_name": w.trainer_name,
            "date": w.date
        }
        for w in workshops
    ]), 200


@course_bp.route("/workshops", methods=["POST"])
@jwt_required()
def add_workshop():
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    workshop = Workshop(
        title=data.get("title"),
        trainer_name=data.get("trainer_name"),
        date=data.get("date")
    )
    db.session.add(workshop)
    db.session.commit()
    return jsonify({"message": "Workshop added"}), 201


@course_bp.route("/workshops/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_workshop(id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    workshop = Workshop.query.get_or_404(id)
    
    # No complex relations for workshops yet, but good to be ready
    db.session.delete(workshop)
    db.session.commit()
    return jsonify({"message": "Workshop deleted"}), 200


@course_bp.route("/workshops/<int:id>", methods=["PUT"])
@jwt_required()
def edit_workshop(id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    workshop = Workshop.query.get_or_404(id)
    data = request.get_json()

    workshop.title = data.get("title", workshop.title)
    workshop.trainer_name = data.get("trainer_name", workshop.trainer_name)
    workshop.date = data.get("date", workshop.date)

    db.session.commit()
    return jsonify({"message": "Workshop updated"}), 200


# ================= INTERNSHIPS =================

@course_bp.route("/internships", methods=["GET"])
def get_internships():
    internships = Internship.query.all()
    return jsonify([
        {
            "id": i.id,
            "intern_name": i.intern_name,
            "mentor_name": i.mentor_name,
            "duration": i.duration
        }
        for i in internships
    ]), 200


@course_bp.route("/internships", methods=["POST"])
@jwt_required()
def add_internship():
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    internship = Internship(
        intern_name=data.get("intern_name"),
        mentor_name=data.get("mentor_name"),
        duration=data.get("duration")
    )
    db.session.add(internship)
    db.session.commit()
    return jsonify({"message": "Internship added"}), 201


@course_bp.route("/internships/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_internship(id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    internship = Internship.query.get_or_404(id)
    
    # ✅ MANUAL CASCADE DELETE
    # 1. Enrollments
    Enrollment.query.filter_by(internship_id=id).delete()
    
    # 2. Tasks & Task Submissions
    tasks = Task.query.filter_by(internship_id=id).all()
    for t in tasks:
        TaskSubmission.query.filter_by(task_id=t.id).delete()
        db.session.delete(t)
        
    # 3. Resources (if added later)
    # InternshipResource.query.filter_by(internship_id=id).delete()

    db.session.delete(internship)
    db.session.commit()
    return jsonify({"message": "Internship and all related data deleted"}), 200


@course_bp.route("/internships/<int:id>", methods=["PUT"])
@jwt_required()
def edit_internship(id):
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    internship = Internship.query.get_or_404(id)
    data = request.get_json()

    internship.intern_name = data.get("intern_name", internship.intern_name)
    internship.mentor_name = data.get("mentor_name", internship.mentor_name)
    internship.duration = data.get("duration", internship.duration)

    db.session.commit()
    return jsonify({"message": "Internship updated"}), 200


# ================= ADMIN DASHBOARD STATS =================

@course_bp.route("/admin/stats", methods=["GET"])
@jwt_required()
def admin_stats():
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return jsonify({"error": "Admin access required"}), 403

    return jsonify({
        "students": User.query.filter_by(role="STUDENT").count(),
        "trainers": User.query.filter_by(role="TRAINER").count(),
        "interns": User.query.filter_by(role="INTERN").count(),
        "courses": Course.query.count()
    }), 200

@course_bp.route("/interns", methods=["GET"])
@jwt_required()
def get_interns():
    interns = User.query.filter_by(role="INTERN").all()
    return jsonify([{
        "id": intern.id,
        "name": intern.name,
        "email": intern.email
    } for intern in interns]), 200


# ================= TASKS =================

@course_bp.route("/tasks", methods=["GET"])
@jwt_required()
def get_tasks():
    claims = get_jwt()
    user_id = get_jwt_identity()
    role = claims.get("role")

    if role == "INTERN" or role == "STUDENT":
        # Intern tasks with "Weekly" structure logic
        raw_tasks = Task.query.filter_by(assigned_to=user_id).order_by(Task.id).all()
        
        # Simulate Weekly structure (4 tasks = 4 weeks)
        # Or just map index to week.
        tasks = []
        is_previous_completed = True # First task is always unlocked
        
        for index, t in enumerate(raw_tasks):
            week_num = index + 1
            
            # Logic: Unlocked if previous is completed AND previous deadline passed
            is_unlocked = True
            if index > 0:
                prev_task = raw_tasks[index-1]
                prev_submitted = (prev_task.status == 'Completed')
                
                prev_deadline_passed = True
                if prev_task.due_date:
                    try:
                        p_date = datetime.strptime(prev_task.due_date, '%Y-%m-%d')
                        if datetime.utcnow().date() <= p_date.date():
                            prev_deadline_passed = False
                    except: pass
                
                is_unlocked = prev_submitted and prev_deadline_passed

            is_submitted = (t.status == 'Completed') # Using status='Completed' as submitted for interns
            
            # Fetch submission details
            submission = TaskSubmission.query.filter_by(task_id=t.id, student_id=user_id).first()
            grade = submission.grade if submission else None
            feedback = submission.feedback if submission else None

            tasks.append({
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date,
                "week_number": week_num,
                "is_unlocked": is_unlocked,
                "is_submitted": is_submitted,
                "display_week": f"Week {week_num}",
                "assigned_by": User.query.get(t.assigned_by).name if t.assigned_by else None,
                "grade": grade,
                "feedback": feedback
            })

        return jsonify(tasks), 200

    elif role == "TRAINER":
        tasks = Task.query.filter_by(assigned_by=user_id).all()
        return jsonify([
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date,
                "assigned_by": User.query.get(t.assigned_by).name if t.assigned_by else None
            }
            for t in tasks
        ]), 200
    else:
        return jsonify({"error": "Unauthorized"}), 403


@course_bp.route("/student/courses", methods=["GET"])
@jwt_required()
def get_student_courses():
    user_id = get_jwt_identity()
    progress_records = StudentProgress.query.filter_by(user_id=user_id).all()
    
    enrolled_courses = []
    for p in progress_records:
        course = Course.query.get(p.course_id)
        if course:
            enrolled_courses.append({
                "id": course.id,
                "name": course.name,
                "date": course.start_date,
                "status": p.status
            })
            
    return jsonify(enrolled_courses), 200




@course_bp.route("/tasks", methods=["POST"])
@jwt_required()
def assign_task():
    claims = get_jwt()
    if claims.get("role") != "TRAINER":
        return jsonify({"error": "Trainer access required"}), 403

    data = request.get_json()
    trainer_id = get_jwt_identity()
    
    tasks_to_create = []
    
    # 1. Assign to Course (All Students in Course)
    if data.get("course_id"):
        students = StudentProgress.query.filter_by(course_id=data["course_id"]).all()
        for s in students:
            tasks_to_create.append(Task(
                title=data.get("title"),
                description=data.get("description"),
                assigned_to=s.user_id,
                assigned_by=trainer_id,
                priority=data.get("priority", "Medium"),
                due_date=data.get("due_date")
            ))
            
    # 2. Assign to Internship (All Interns in Internship)
    elif data.get("internship_id"):
        enrollments = Enrollment.query.filter_by(internship_id=data["internship_id"]).all()
        for e in enrollments:
            tasks_to_create.append(Task(
                title=data.get("title"),
                description=data.get("description"),
                assigned_to=e.user_id,
                assigned_by=trainer_id,
                priority=data.get("priority", "Medium"),
                due_date=data.get("due_date"),
                internship_id=data["internship_id"] # ✅ NEW: Save internship_id for backfilling logic
            ))
            
    # 3. Assign to Individual
    elif data.get("assigned_to"):
        tasks_to_create.append(Task(
            title=data.get("title"),
            description=data.get("description"),
            assigned_to=data.get("assigned_to"),
            assigned_by=trainer_id,
            priority=data.get("priority", "Medium"),
            due_date=data.get("due_date"),
            internship_id=data.get("internship_id")
        ))
    
    if not tasks_to_create:
        return jsonify({"error": "No valid targets found for assignment"}), 400

    db.session.add_all(tasks_to_create)
    db.session.commit()
    return jsonify({"message": f"Task assigned to {len(tasks_to_create)} users"}), 201


@course_bp.route("/tasks/<int:id>", methods=["PUT"])
@jwt_required()
def update_task(id):
    claims = get_jwt()
    task = Task.query.get_or_404(id)
    user_id = get_jwt_identity()
    role = claims.get("role")

    if role == "INTERN" and task.assigned_to != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    if role == "TRAINER" and task.assigned_by != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    if "status" in data:
        task.status = data["status"]
    if "description" in data and role == "TRAINER":
        task.description = data["description"]
    db.session.commit()
    return jsonify({"message": "Task updated"}), 200


@course_bp.route("/tasks/<int:id>/submit", methods=["POST"])
@jwt_required()
def submit_task(id):
    claims = get_jwt()
    task = Task.query.get_or_404(id)
    if task.assigned_to != get_jwt_identity():
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    submission = Submission(
        task_id=id,
        submitted_by=get_jwt_identity(),
        content=data.get("content")
    )
    task.status = "Submitted"
    db.session.add(submission)
    db.session.commit()
    return jsonify({"message": "Task submitted"}), 201


@course_bp.route("/submissions", methods=["GET"])
@jwt_required()
def get_submissions():
    claims = get_jwt()
    if claims.get("role") != "TRAINER":
        return jsonify({"error": "Trainer access required"}), 403

    submissions = Submission.query.join(Task).filter(Task.assigned_by == get_jwt_identity()).all()
    return jsonify([
        {
            "id": s.id,
            "task_title": Task.query.get(s.task_id).title,
            "submitted_by": User.query.get(s.submitted_by).name,
            "content": s.content,
            "submitted_at": s.submitted_at.isoformat()
        }
        for s in submissions
    ]), 200


# ================= ENROLLMENTS =================

@course_bp.route("/enrollments", methods=["GET"])
@jwt_required()
def get_enrollments():
    user_id = get_jwt_identity()

    enrollments = Enrollment.query.filter_by(user_id=user_id).all()
    enrolled_internships = []
    for e in enrollments:
        internship = Internship.query.get(e.internship_id)
        if internship:
            enrolled_internships.append({
                "id": internship.id,
                "intern_name": internship.intern_name,
                "mentor_name": internship.mentor_name,
                "duration": internship.duration,
                "enrolled_at": e.enrolled_at.isoformat()
            })
    return jsonify(enrolled_internships), 200


@course_bp.route("/enrollments", methods=["POST"])
@jwt_required()
def enroll_internship():
    user_id = get_jwt_identity()

    data = request.get_json()
    internship_id = data.get("internship_id")

    if not internship_id:
        return jsonify({"error": "Internship ID required"}), 400

    # Check if already enrolled
    existing = Enrollment.query.filter_by(user_id=user_id, internship_id=internship_id).first()
    if existing:
        return jsonify({"error": "Already enrolled"}), 400

    enrollment = Enrollment(user_id=user_id, internship_id=internship_id)
    db.session.add(enrollment)
    
    # ✅ BACKFILL: Find existing tasks for this internship and assign them to the new intern
    # Strategy 1: Check tasks explicitly linked to internship (New System)
    existing_tasks = Task.query.filter_by(internship_id=internship_id).all()
    
    # Strategy 2: If no tasks found, check tasks assigned to PEERS in the same internship (Legacy Support)
    # This handles tasks created before internship_id was being saved.
    if not existing_tasks:
        peer_enrollments = Enrollment.query.filter_by(internship_id=internship_id).all()
        peer_ids = [e.user_id for e in peer_enrollments if e.user_id != user_id]
        
        if peer_ids:
            # Get tasks assigned to peers
            peer_tasks = Task.query.filter(Task.assigned_to.in_(peer_ids)).all()
            existing_tasks.extend(peer_tasks)

    # Deduplicate by title to avoid assigning the same task multiple times
    unique_tasks = {t.title: t for t in existing_tasks} 
    
    for _, t in unique_tasks.items():
        # Check if user already has this task (sanity check)
        user_has_task = Task.query.filter_by(assigned_to=user_id, title=t.title).first()
        if not user_has_task:
            new_task = Task(
                title=t.title,
                description=t.description,
                assigned_to=user_id,
                assigned_by=t.assigned_by,
                internship_id=internship_id,
                priority=t.priority,
                due_date=t.due_date,
                status="Pending", # Start fresh
                week_number=t.week_number
            )
            db.session.add(new_task)

    db.session.commit()
    return jsonify({"message": "Enrolled successfully"}), 201





@course_bp.route("/mentors", methods=["GET"])
@jwt_required()
def get_mentors():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    trainers = []
    # Combined Logic: Get courses from BOTH StudentProgress and Enrollment
    if user and user.role == "STUDENT":
        # 1. From Enrollments
        enrollments = Enrollment.query.filter_by(user_id=user_id).all()
        course_ids = {e.course_id for e in enrollments if e.course_id}
        
        # 2. From Progress (Legacy support)
        progress = StudentProgress.query.filter_by(user_id=user_id).all()
        course_ids.update({p.course_id for p in progress})
        
        if course_ids:
            courses = Course.query.filter(Course.id.in_(course_ids)).all()
            mentor_names = [c.mentor_name for c in courses if c.mentor_name]
            if mentor_names:
                trainers = User.query.filter(User.name.in_(mentor_names), User.role == "TRAINER").all()

    # Fallback: If no mentors found (or not student), Return ALL trainers
    if not trainers:
        trainers = User.query.filter_by(role="TRAINER").all()

    return jsonify([
        {
            "id": t.id, 
            "name": t.name, 
            "email": t.email,
            "expertise": "Course Instructor"
        }
        for t in trainers
    ]), 200

# ================= INTERN DASHBOARD STATS =================

@course_bp.route("/intern/stats", methods=["GET"])
@jwt_required()
def get_intern_stats():
    user_id = int(get_jwt_identity())
    print(f"DEBUG: Fetching stats for User ID: {user_id}")
    user = User.query.get(user_id)
    
    # 1. Tasks Stats
    tasks = Task.query.filter_by(assigned_to=user_id).all()
    print(f"DEBUG: Found {len(tasks)} tasks")
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == 'Completed'])
    pending_tasks = total_tasks - completed_tasks
    
    # 2. Enrollment Stats
    enrollments = Enrollment.query.filter_by(user_id=user_id).all()
    print(f"DEBUG: Found {len(enrollments)} enrollments")
    enrolled_count = len(enrollments)
    
    # 3. Overall Progress (Average of all enrolled internships/courses)
    # For now, simple calculation: (completed_tasks / total_tasks) * 100
    if total_tasks > 0:
        overall_progress = int((completed_tasks / total_tasks) * 100)
    else:
        overall_progress = 0
        
    # 4. Today's Focus (Tasks due today or high priority pending)
    today = datetime.utcnow().date()
    tasks_done_today = 0
    
    submissions = TaskSubmission.query.filter_by(student_id=user_id).all()
    tasks_done_today = len([
        s for s in submissions 
        if s.submitted_at.date() == today
    ])
    
    # 5. Mentor Details
    mentor_name = "Not Assigned"
    if enrollments:
        # Assuming last enrollment is current
        last_enrollment = enrollments[-1] 
        if last_enrollment.internship_id:
             internship = Internship.query.get(last_enrollment.internship_id)
             if internship:
                 mentor_name = internship.mentor_name

    return jsonify({
        "tasks_completed": completed_tasks,
        "tasks_pending": pending_tasks,
        "overall_progress": overall_progress,
        "internships_enrolled": enrolled_count,
        "tasks_done_today": tasks_done_today,
        "current_streak": user.current_streak if user.current_streak else 0,
        "mentor_name": mentor_name
    }), 200

@course_bp.route("/intern/certificate", methods=["POST"])
@jwt_required()
def generate_intern_certificate():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Verify eligibility (simple check: 100% progress or all assigned tasks completed)
    tasks = Task.query.filter_by(assigned_to=user_id).all()
    if not tasks:
        return jsonify({"error": "No tasks assigned"}), 400
        
    completed = [t for t in tasks if t.status == 'Completed']
    if len(completed) < len(tasks):
        return jsonify({"error": "Complete all tasks first"}), 400
        
    # Generate PDF
    try:
        from reportlab.lib.pagesizes import landscape, A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch
        from reportlab.lib.colors import HexColor
        from reportlab.lib.utils import ImageReader
        import os
        
        # Ensure static folder for certs
        cert_dir = os.path.join(os.getcwd(), 'static', 'certificates')
        os.makedirs(cert_dir, exist_ok=True)
        
        filename = f"Intern_Certificate_{user_id}.pdf"
        filepath = os.path.join(cert_dir, filename)
        
        # Setup Canvas
        width, height = landscape(A4)
        c = canvas.Canvas(filepath, pagesize=landscape(A4))
        
        # Fetch Internship Details
        internship_name = "Internship Program" # Default
        enrollment = Enrollment.query.filter_by(user_id=user_id).first()
        if enrollment and enrollment.internship_id:
            intern = Internship.query.get(enrollment.internship_id)
            if intern:
                name = intern.intern_name.strip()
                if not name.lower().endswith("internship"):
                    internship_name = f"{name} Internship"
                else:
                    internship_name = name 

        # ================= DESIGN =================
        
        # 1. Background (Subtle Cream/White)
        c.setFillColor(HexColor("#FFFAF0"))
        c.rect(0, 0, width, height, fill=1)
        
        # 2. Ornate Border
        c.setStrokeColor(HexColor("#DAA520")) # GoldenRod
        c.setLineWidth(5)
        c.rect(20, 20, width - 40, height - 40)
        
        c.setStrokeColor(HexColor("#2C3E50")) # Dark Blue
        c.setLineWidth(2)
        c.rect(28, 28, width - 56, height - 56)

        # 3. Logos (Header)
        # Strategy: 3 Columns. Left=AICTE, Center=Analogica, Right=MSME
        
        logo_dir = os.path.join(os.getcwd(), 'static', 'logos')
        aicte_path = os.path.join(logo_dir, 'aicte_logo.jpg')
        msme_path = os.path.join(logo_dir, 'msme_logo.png')
        analogica_path = os.path.join(os.getcwd(), 'static', 'analogica_logo.jpg')
        
        logo_y = height - 90
        logo_size = 60 # Smaller logos

        # Left Logo
        if os.path.exists(aicte_path):
             c.drawImage(aicte_path, 60, logo_y - 10, width=logo_size, height=logo_size, mask='auto', preserveAspectRatio=True)
            
        # Right Logo
        if os.path.exists(msme_path):
             c.drawImage(msme_path, width - 60 - logo_size, logo_y - 10, width=logo_size, height=logo_size, mask='auto', preserveAspectRatio=True)
            
        # Center Logo
        if os.path.exists(analogica_path):
             c.drawImage(analogica_path, width/2 - 30, logo_y - 5, width=60, height=60, mask='auto', preserveAspectRatio=True)
        
        # 4. Company Name (Below Center Logo)
        c.setFont("Helvetica-Bold", 28)
        c.setFillColor(HexColor("#2C3E50"))
        c.drawCentredString(width / 2, height - 120, "ANALOGICA SKILL TRACK")
        
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(HexColor("#7F8C8D"))
        c.drawCentredString(width / 2, height - 145, "Center for Technical Excellence")

        # 5. Certificate Title
        c.setFont("Helvetica-Bold", 42)
        c.setFillColor(HexColor("#C0392B")) # Deep Red for Title
        c.drawCentredString(width / 2, height - 220, "CERTIFICATE OF COMPLETION")
        
        # 6. Body Text
        c.setFont("Helvetica", 16)
        c.setFillColor(HexColor("#34495E"))
        c.drawCentredString(width / 2, height - 270, "This is to certify that")
        
        # Student Name
        c.setFont("Helvetica-Bold", 32)
        c.setFillColor(HexColor("#2980B9")) # Nice Blue
        c.drawCentredString(width / 2, height - 320, user.name.upper())
        
        # Decorative Line
        c.setLineWidth(1)
        c.setStrokeColor(HexColor("#BDC3C7"))
        c.line(width/2 - 200, height - 330, width/2 + 200, height - 330)

        c.setFont("Helvetica", 16)
        c.setFillColor(HexColor("#34495E"))
        c.drawCentredString(width / 2, height - 370, "has successfully completed the internship program in")

        # Internship Name
        c.setFont("Helvetica-Bold", 24)
        c.setFillColor(HexColor("#2C3E50"))
        c.drawCentredString(width / 2, height - 410, internship_name)

        # Date
        date_str = datetime.utcnow().strftime('%B %d, %Y')
        c.setFont("Helvetica", 14)
        c.setFillColor(HexColor("#7F8C8D"))
        c.drawCentredString(width / 2, height - 450, f"Issued on: {date_str}")

        # 7. Signatures
        # Bottom Left
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(HexColor("#2C3E50"))
        c.line(100, 100, 250, 100)
        c.drawString(110, 80, "Program Director")
        
        # Bottom Right
        c.line(width - 250, 100, width - 100, 100)
        c.drawRightString(width - 110, 80, "Authorized Signatory")
        c.setFont("Helvetica", 10)
        c.drawRightString(width - 120, 65, "Analogica SkillTrack")
        
        # 8. Verification Link/ID
        cert_id = f"REF: {user_id}-{enrollment.internship_id if enrollment else 0}-{int(datetime.utcnow().timestamp())}"
        c.setFont("Courier", 8)
        c.setFillColor(HexColor("#BDC3C7"))
        c.drawCentredString(width/2, 40, cert_id)

        c.save()
        
        return jsonify({"message": "Certificate generated", "url": f"/certificates/{filename}"}), 200
        
    except Exception as e:
        print(f"Cert Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Gen Error: {str(e)}"}), 500

@course_bp.route("/intern/task/<int:task_id>/complete", methods=["POST"])
@jwt_required()
def complete_intern_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.get(task_id)
    
    if not task:
        return jsonify({"error": "Task not found"}), 404
        
    if task.assigned_to != int(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    # ✅ DEADLINE ENFORCEMENT
    if task.due_date:
        try:
             due = datetime.strptime(task.due_date, '%Y-%m-%d')
             # Grace period: allow submission on the day of deadline (until midnight)
             # Current time: UTC. If deadline is just date, it means 00:00 of that date? NO, usually deadline means end of that day.
             # Let's assume deadline is inclusive. So if today <= due_date_day, allowed.
             # If today > due_date, blocked.
             if datetime.utcnow().date() > due.date():
                 return jsonify({"error": f"Deadline passed ({task.due_date}). Submission rejected."}), 403
        except ValueError:
             pass # Ignore invalid date formats

    # Handle File Upload
    file = request.files.get("file")  # Restored missing line
    file_path = None
    
    if file:
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type. Allowed: PDF, ZIP, Documents. PNGs are not allowed."}), 400

        import os
        from werkzeug.utils import secure_filename
        
        # Use absolute path for safety
        BASE_DIR = os.getcwd() # Or use app.root_path if available
        upload_folder = os.path.join(BASE_DIR, 'static', 'uploads', 'intern_tasks')
        os.makedirs(upload_folder, exist_ok=True)
        
        filename = secure_filename(file.filename)
        # Unique filename to prevent overwrite
        import uuid
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        
        # Save file
        full_path = os.path.join(upload_folder, unique_name)
        file.save(full_path)
        
        # Store relative path for serving
        file_path = f"static/uploads/intern_tasks/{unique_name}"
        
    # Mark as completed
    task.status = "Completed"
    
    # Create or Update Submission
    existing_sub = TaskSubmission.query.filter_by(task_id=task.id, student_id=user_id).first()
    if not existing_sub:
        new_sub = TaskSubmission(
            task_id=task.id,
            student_id=user_id,
            # content="Marked as completed by Intern", # Field does not exist in TaskSubmission
            file_path=file_path, 
            submitted_at=datetime.utcnow()
        )
        db.session.add(new_sub)
    else:
        existing_sub.submitted_at = datetime.utcnow()
        if file_path:
            existing_sub.file_path = file_path # Update file path if re-submitted
        
    db.session.commit()
    
    return jsonify({"message": "Task completed"}), 200
