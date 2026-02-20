from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from datetime import datetime, timedelta
from extensions import db
from models import Course, Workshop, Internship, User, Task, Submission, Enrollment, StudentProgress, TaskSubmission, CourseResource

from utils import allowed_file, get_required_assignments, parse_duration_to_days

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
    # Certificate.query.filter_by(course_id=id).delete() 
    
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
            "location": w.location,
            "start_date": w.start_date,
            "end_date": w.end_date
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
        location=data.get("location"),
        start_date=data.get("start_date"),
        end_date=data.get("end_date")
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
    workshop.location = data.get("location", workshop.location)
    workshop.start_date = data.get("start_date", workshop.start_date)
    workshop.end_date = data.get("end_date", workshop.end_date)

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
    Enrollment.query.filter_by(internship_id=id).delete()
    
    tasks = Task.query.filter_by(internship_id=id).all()
    for t in tasks:
        TaskSubmission.query.filter_by(task_id=t.id).delete()
        db.session.delete(t)
        
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
    user_id = int(get_jwt_identity())
    role = claims.get("role")

    if role == "INTERN" or role == "STUDENT":
        # Order by internship first to grouping works for unlocking logic
        raw_tasks = Task.query.filter_by(assigned_to=user_id).order_by(Task.internship_id, Task.week_number, Task.id).all()
        tasks = []
        
        for index, t in enumerate(raw_tasks):
            week_num = t.week_number # Trust the week number
            is_unlocked = True
            
            # Check previous task ONLY if it belongs to same internship
            if index > 0 and t.internship_id == raw_tasks[index-1].internship_id:
                prev_task = raw_tasks[index-1]
                prev_submitted = (prev_task.status == 'Completed')
                prev_deadline_passed = True
                if prev_task.due_date:
                    try:
                        p_date = datetime.strptime(prev_task.due_date, '%Y-%m-%d')
                        if datetime.utcnow().date() <= p_date.date():
                            prev_deadline_passed = False
                    except: pass
                # UNLOCK LOGIC: Time-gated by previous deadline
                # "task should unlock only when previous deadline is met"
                is_unlocked = prev_deadline_passed

            is_submitted = (t.status == 'Completed')
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
                "feedback": feedback,
                "internship_name": Internship.query.get(t.internship_id).intern_name if t.internship_id else "General Tasks",
                "internship_id": t.internship_id
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
    user_id = int(get_jwt_identity())
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
    trainer_id = int(get_jwt_identity())
    
    tasks_to_create = []
    
    if data.get("course_id"):
        students = StudentProgress.query.filter_by(course_id=data["course_id"]).all()
        for s in students:
            tasks_to_create.append(Task(
                title=data.get("title"),
                description=data.get("description"),
                assigned_to=s.user_id,
                assigned_by=trainer_id,
                priority=data.get("priority", "Medium"),
                due_date=data.get("due_date"),
                course_id=data.get("course_id") # ✅ Saved
            ))
            
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
                internship_id=data["internship_id"]
            ))
            
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
    user_id = int(get_jwt_identity())
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
    if task.assigned_to != int(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    submission = Submission(
        task_id=id,
        submitted_by=int(get_jwt_identity()),
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

    submissions = Submission.query.join(Task).filter(Task.assigned_by == int(get_jwt_identity())).all()
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
    user_id = int(get_jwt_identity())

    enrollments = Enrollment.query.filter_by(user_id=user_id).all()
    enrolled_internships = []
    
    for e in enrollments:
        if e.internship_id:
            internship = Internship.query.get(e.internship_id)
            if internship:
                # Calculate progress for this specific internship
                tasks = Task.query.filter_by(internship_id=internship.id, assigned_to=user_id).all()
                completed = len([t for t in tasks if t.status == 'Completed'])
                
                # Dynamic requirement based on duration
                required = get_required_assignments(internship.duration)
                
                # Progress calculation
                progress = int((completed / max(required, 1)) * 100)
                progress = min(progress, 100)

                enrolled_internships.append({
                    "id": internship.id,
                    "intern_name": internship.intern_name,
                    "mentor_name": internship.mentor_name,
                    "duration": internship.duration,
                    "enrolled_at": e.enrolled_at.isoformat(),
                    "progress": progress,
                    "tasks_completed": completed,
                    "tasks_total": required
                })
                
    return jsonify(enrolled_internships), 200


@course_bp.route("/enrollments", methods=["POST"])
@jwt_required()
def enroll_internship():
    user_id = int(get_jwt_identity())

    data = request.get_json()
    internship_id = data.get("internship_id")

    if not internship_id:
        return jsonify({"error": "Internship ID required"}), 400

    existing = Enrollment.query.filter_by(user_id=user_id, internship_id=internship_id).first()
    if existing:
        return jsonify({"error": "Already enrolled"}), 400

    enrollment = Enrollment(user_id=user_id, internship_id=internship_id)
    db.session.add(enrollment)
    
    # Backfill logic simplified
    existing_tasks = Task.query.filter_by(internship_id=internship_id).all()
    
    # Logic to populate tasks if they exist for the internship template (via other users or trainers)
    # Ideally should copy from a TemplateTask table, but here acts as copy from peers
    if not existing_tasks:
        peer_enrollments = Enrollment.query.filter_by(internship_id=internship_id).all()
        peer_ids = [e.user_id for e in peer_enrollments if e.user_id != user_id]
        if peer_ids:
            # Get tasks assigned to peers for this internship
            peer_tasks = Task.query.filter(Task.assigned_to.in_(peer_ids), Task.internship_id == internship_id).all()
            existing_tasks.extend(peer_tasks)

    unique_tasks = {t.title: t for t in existing_tasks} 
    for _, t in unique_tasks.items():
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
                status="Pending",
                week_number=t.week_number
            )
            db.session.add(new_task)

    db.session.commit()
    return jsonify({"message": "Enrolled successfully"}), 201


@course_bp.route("/mentors", methods=["GET"])
@jwt_required()
def get_mentors():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    trainers = []
    if user and user.role == "STUDENT":
        enrollments = Enrollment.query.filter_by(user_id=user_id).all()
        course_ids = {e.course_id for e in enrollments if e.course_id}
        progress = StudentProgress.query.filter_by(user_id=user_id).all()
        course_ids.update({p.course_id for p in progress})
        if course_ids:
            courses = Course.query.filter(Course.id.in_(course_ids)).all()
            mentor_names = [c.mentor_name for c in courses if c.mentor_name]
            if mentor_names:
                trainers = User.query.filter(User.name.in_(mentor_names), User.role == "TRAINER").all()

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
    user = User.query.get(user_id)
    
    # ✅ STREAK UPDATE LOGIC (Same as Student Dashboard)
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    
    # If no activity recorded yet, or last activity was NOT today
    if user.last_activity_date != today:
        if user.last_activity_date == yesterday:
            user.current_streak = (user.current_streak or 0) + 1
        else:
            # Broken streak (unless it's the very first time, handled by 0 default)
            # If last activity was older than yesterday, reset to 1
            user.current_streak = 1
        
        user.last_activity_date = today
        db.session.commit()
    # Calculate Total Tasks (Assigned across all internships)
    tasks = Task.query.filter_by(assigned_to=user_id).all()
    total_assigned_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == 'Completed'])
    pending_tasks = total_assigned_tasks - completed_tasks
    
    tasks_done_today = 0
    today = datetime.utcnow().date()
    submissions = TaskSubmission.query.filter_by(student_id=user_id).all()
    tasks_done_today = len([s for s in submissions if s.submitted_at.date() == today])
    
    # Calculate Overall Progress (Average of all Enrolled Internships)
    enrollments = Enrollment.query.filter_by(user_id=user_id).all()
    enrolled_count = 0
    completion_rates = []
    mentor_name = "Not Assigned"
    
    for e in enrollments:
        if e.internship_id:
            enrolled_count += 1
            internship = Internship.query.get(e.internship_id)
            if internship:
                mentor_name = internship.mentor_name # Takes the last one
                
                # Internship specific progress
                i_tasks = Task.query.filter_by(internship_id=internship.id, assigned_to=user_id).all()
                 
                i_completed = len([t for t in i_tasks if t.status == 'Completed'])
                i_required = get_required_assignments(internship.duration)
                
                rate = int((i_completed / max(i_required, 1)) * 100)
                completion_rates.append(min(rate, 100))
    
    # Average progress across all internships
    overall_progress = int(sum(completion_rates) / len(completion_rates)) if completion_rates else 0

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
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    data = request.get_json() or {}
    internship_id = data.get("internship_id")
    
    # Identify target enrollment
    if internship_id:
        enrollment = Enrollment.query.filter_by(user_id=user_id, internship_id=internship_id).first()
    else:
        # Default to most recent
        enrollment = Enrollment.query.filter_by(user_id=user_id).order_by(Enrollment.enrolled_at.desc()).first()
        
    if not enrollment:
        return jsonify({"error": "No enrollment found"}), 404
        
    required_count = 4
    if enrollment.internship_id:
        internship = Internship.query.get(enrollment.internship_id)
        if internship:
             required_count = get_required_assignments(internship.duration)
    
    # Check tasks specific to this internship
    if enrollment.internship_id:
        tasks = Task.query.filter_by(assigned_to=user_id, internship_id=enrollment.internship_id).all()
        # Fallback for old tasks without internship_id but enrolled in only 1? 
        # Better to be strict: only count tasks linked to this internship
    else:
        tasks = Task.query.filter_by(assigned_to=user_id).all()

    completed = [t for t in tasks if t.status == 'Completed']
    
    if len(completed) < required_count:
        return jsonify({"error": f"Complete all {required_count} tasks first"}), 400
        
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch
        from reportlab.lib.colors import HexColor
        from reportlab.lib.utils import simpleSplit # Added for wrapping
        import os
        import uuid
        
        cert_dir = os.path.join(os.getcwd(), 'static', 'certificates')
        os.makedirs(cert_dir, exist_ok=True)
        
        filename = f"Intern_Certificate_{user_id}_{enrollment.internship_id}.pdf"
        filepath = os.path.join(cert_dir, filename)
        
        # Setup Canvas (Portrait A4)
        width, height = A4
        c = canvas.Canvas(filepath, pagesize=A4)
        
        # Fetch Details
        internship_name = "Internship Program"
        start_date = "December 2024"
        end_date = "January 2025"
        
        mentor_name = "Mentor"
        
        if enrollment:
            if enrollment.internship_id:
                i = Internship.query.get(enrollment.internship_id)
                if i: 
                   name = i.intern_name.strip()
                   internship_name = f"{name} Internship" if not name.lower().endswith("internship") else name
                   mentor_name = i.mentor_name
                   
                   # Dynamically calculate duration based on internship setting
                   from datetime import timedelta
                   end_dt = datetime.utcnow()
                   
                   # Use utility to get days from duration string (e.g., "2 weeks" -> 14)
                   duration_days = parse_duration_to_days(i.duration)
                   start_dt = end_dt - timedelta(days=duration_days) 
                   
                   # Precise dates for certificate
                   start_date = start_dt.strftime("%B %d, %Y")
                   end_date = end_dt.strftime("%B %d, %Y")

        issue_date = datetime.utcnow().strftime("%B %d, %Y")
        short_uuid = str(uuid.uuid4())[:8].upper()
        # Clean ID
        cert_id = f"ANLG/INT/{user_id}/{short_uuid}"

        # ================= DESIGN (Portrait Professional) =================
        
        # 1. Background
        c.setFillColor(HexColor("#FFFFFF"))
        c.rect(0, 0, width, height, fill=1)
        
        # 2. Borders
        c.setStrokeColor(HexColor("#4f46e5")) # Main Blue
        c.setLineWidth(10)
        c.rect(20, 20, width - 40, height - 40)
        
        c.setStrokeColor(HexColor("#f59e0b")) # Amber
        c.setLineWidth(2)
        c.rect(35, 35, width - 70, height - 70)

        # 3. Logo (Header)
        logo_dir = os.path.join(os.getcwd(), 'static', 'logos')
        analogica_path = os.path.join(os.getcwd(), 'static', 'analogica_logo.jpg')
        
        # Center Logo (Analogica) - TOP
        logo_y_top = height - 120
        if os.path.exists(analogica_path):
             c.drawImage(analogica_path, width/2 - 30, logo_y_top, width=60, height=60, mask='auto', preserveAspectRatio=True)
        else:
            c.setFillColor(HexColor("#0f172a"))
            c.circle(width/2, logo_y_top + 30, 30, fill=1)

        # 4. Company Name
        c.setFont("Helvetica-Bold", 30)
        c.setFillColor(HexColor("#1e3a8a"))
        c.drawCentredString(width / 2, height - 160, "ANALOGICA SKILL TRACK")
        
        # 5. Title
        c.setFont("Helvetica", 18)
        c.setFillColor(HexColor("#64748b"))
        c.drawCentredString(width / 2, height - 215, "CERTIFICATE OF ACHIEVEMENT")
        
        # Divider
        c.setStrokeColor(HexColor("#f59e0b"))
        c.setLineWidth(2)
        c.line(width/2 - 100, height - 230, width/2 + 100, height - 230)

        # 6. Body Text (Professional Wrap)
        text_y = height - 280
        margin_x = 60
        max_width = width - 120
        
        def draw_wrapped_text(c, text, x, y, max_w, font, size, leading):
            lines = simpleSplit(text, font, size, max_w)
            curr_y = y
            for line in lines:
                c.setFont(font, size)
                c.drawString(x, curr_y, line)
                curr_y -= leading
            return curr_y - 12

        current_y = text_y
        
        # Para 1
        name = user.name.upper()
        # Adjusted text: Removed "currently pursuing their degree" assumption and improved flow.
        intro = f"This is to certify that {name}, (Intern ID: {cert_id}), has successfully completed the {internship_name} with Analogica SkillTrack from {start_date} to {end_date}."
        current_y = draw_wrapped_text(c, intro, margin_x, current_y, max_width, "Times-Roman", 12, 18)
        
        # Para 2
        feedback = "During this period, they have served as a dedicated intern and have displayed remarkable sincerity, and a strong desire to learn. They have exhibited exceptional coordination skills and effective communication abilities. Moreover, attention to detail has been truly impressive."
        current_y = draw_wrapped_text(c, feedback, margin_x, current_y, max_width, "Times-Roman", 12, 18)

        # Para 3
        passion = f"They have consistently approached new assignments and challenges with enthusiasm, showcasing passion for {internship_name}. Their commitment and willingness to acquire new knowledge and skills have been evident throughout this internship."
        current_y = draw_wrapped_text(c, passion, margin_x, current_y, max_width, "Times-Roman", 12, 18)
        
        # Para 4
        wishes = f"We extend our best wishes to {name} for a successful future, and we have no doubt that they will continue to excel in the field."
        current_y = draw_wrapped_text(c, wishes, margin_x, current_y, max_width, "Times-Roman", 12, 18)

        # Extra: Issue Date (Aligned right below text)
        c.setFont("Helvetica-Bold", 12)
        c.drawRightString(width - 60, current_y - 10, f"Date: {issue_date}")


        # 12. Bottom Badge (Removed)
        # c.setStrokeColor(HexColor("#d97706")) 
        # c.setLineWidth(2)
        # c.circle(width/2, height - 600, 35, stroke=1, fill=0)
        # c.setFont("Helvetica-Bold", 10)
        # c.setFillColor(HexColor("#d97706"))
        # c.drawCentredString(width/2, height - 600 - 4, "VERIFIED")

        # 13. Signatures & Footer Logos
        footer_y = 100
        
        # Left: Signature
        c.setLineWidth(1)
        c.setStrokeColor(HexColor("#000000"))
        c.line(80, footer_y + 30, 230, footer_y + 30)
        
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(HexColor("#000000"))
        c.drawString(80, footer_y + 10, "Director")
        c.setFont("Helvetica", 10)
        c.setFillColor(HexColor("#64748b"))
        c.drawString(80, footer_y - 5, "Analogica SkillTrack")
        
        # Right: Logos (AICTE & MSME)
        aicte_path = os.path.join(logo_dir, 'aicte_logo.jpg')
        msme_path = os.path.join(logo_dir, 'msme_logo.png')
        logo_y_bottom = 70 
        logo_w = 50
        gap = 20
        start_x_logos = width - 200
        
        if os.path.exists(aicte_path):
             c.drawImage(aicte_path, start_x_logos, logo_y_bottom, width=50, height=50, mask='auto', preserveAspectRatio=True)
        if os.path.exists(msme_path):
             c.drawImage(msme_path, start_x_logos + 60, logo_y_bottom, width=80, height=50, mask='auto', preserveAspectRatio=True)

        c.save()
        return jsonify({"message": "Certificate generated", "url": f"/static/certificates/{filename}"}), 201
        
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        try:
             with open("certificate_error.log", "w") as f:
                 f.write(error_msg)
        except: pass
        return jsonify({"error": "PDF Generation Failed. Check server logs."}), 500

@course_bp.route("/intern/task/<int:task_id>/complete", methods=["POST"])
@jwt_required()
def complete_intern_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.get(task_id)
    if not task: return jsonify({"error": "Task not found"}), 404
      
    if task.assigned_to != int(user_id): return jsonify({"error": "Unauthorized"}), 403

    # ✅ DEADLINE ENFORCEMENT REMOVED
    # if task.due_date:
    #     try:
    #          due = datetime.strptime(task.due_date, '%Y-%m-%d')
    #          if datetime.utcnow().date() > due.date():
    #              return jsonify({"error": f"Deadline passed ({task.due_date}). Submission rejected."}), 403
    #     except ValueError: pass

    file = request.files.get("file")
    file_path = None
    
    if file:
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type. Allowed: PDF, ZIP, Documents. PNGs are not allowed."}), 400

        import os
        from werkzeug.utils import secure_filename
        BASE_DIR = os.getcwd()
        upload_folder = os.path.join(BASE_DIR, 'static', 'uploads', 'intern_tasks')
        os.makedirs(upload_folder, exist_ok=True)
        
        filename = secure_filename(file.filename)
        import uuid
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        full_path = os.path.join(upload_folder, unique_name)
        file.save(full_path)
        file_path = f"static/uploads/intern_tasks/{unique_name}"
        
    task.status = "Completed"
    existing_sub = TaskSubmission.query.filter_by(task_id=task.id, student_id=user_id).first()
    if not existing_sub:
        new_sub = TaskSubmission(task_id=task.id, student_id=user_id, file_path=file_path, submitted_at=datetime.utcnow())
        db.session.add(new_sub)
    else:
        existing_sub.submitted_at = datetime.utcnow()
        if file_path: existing_sub.file_path = file_path
        
    db.session.commit()
    return jsonify({"message": "Task completed"}), 200
