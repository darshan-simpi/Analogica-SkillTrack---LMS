from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import os
from reportlab.lib.pagesizes import landscape, letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor

from models import Enrollment, Course, Assignment, Submission, StudentProgress, CourseResource, Certificate, User
from extensions import db

student_bp = Blueprint("student", __name__)

UPLOAD_FOLDER = "uploads"
def get_required_assignments(duration_str):
    try:
        # Example: "2 Months" -> 2
        # Example: "1 Month" -> 1
        parts = duration_str.lower().split()
        if len(parts) >= 2:
            if "month" in parts[1]:
                return int(parts[0]) * 4
            elif "week" in parts[1]:
                return int(parts[0])
        return 4 # Default to 1 month (4 assignments)
    except:
        return 4

# ✅ NEW PROGRESS ENDPOINT
@student_bp.route("/student/progress", methods=["GET"])
@jwt_required()
def student_progress():
    student_id = int(get_jwt_identity())
    enrollments = Enrollment.query.filter_by(user_id=student_id).all()
    response = []

    for e in enrollments:
        course = Course.query.get(e.course_id)
        if not course: continue
        
        progress = StudentProgress.query.filter_by(user_id=student_id, course_id=course.id).first()
        
        if progress:
            response.append({
                "course_id": course.id,
                "course_name": course.name,
                "progress": min(progress.progress, 100),
                "status": progress.status,
                "assignments_completed": progress.assignments_completed,
                "total_assignments": progress.total_assignments
            })

    return jsonify(response), 200

# ✅ MAIN DASHBOARD ENDPOINT
@student_bp.route("/student/dashboard", methods=["GET"])
@jwt_required()
def student_dashboard():
    student_id = int(get_jwt_identity())
    student = User.query.get(student_id)

    # ✅ 1. STUDY STREAK LOGIC
    today_date = datetime.utcnow().date()
    yesterday = today_date - timedelta(days=1)
    
    # If no activity recorded yet, or last activity was NOT today
    if student.last_activity_date != today_date:
        if student.last_activity_date == yesterday:
            student.current_streak += 1
        elif student.last_activity_date != today_date:
             # Broken streak (unless it's the very first time, handled by 0 default)
             # If last activity was older than yesterday, reset to 1 (active today)
             student.current_streak = 1
        
        student.last_activity_date = today_date
        db.session.commit()

    # ✅ 2. OVERALL GRADE LOGIC
    # Get all submissions that have a grade
    all_submissions = Submission.query.filter_by(student_id=student_id).all()
    valid_grades = []
    
    for s in all_submissions:
        if s.grade:
            try:
                # Remove '%' if present and convert to float
                clean_grade = s.grade.replace('%', '').strip()
                valid_grades.append(float(clean_grade))
            except ValueError:
                pass # Ignore non-numeric grades like "A", "Pass"
    
    if len(valid_grades) > 0:
        overall_grade = int(sum(valid_grades) / len(valid_grades))
        overall_grade_str = f"{overall_grade}%"
    else:
        overall_grade_str = "N/A"

    enrollments = Enrollment.query.filter_by(user_id=student_id).all()
    response = []

    for e in enrollments:
        course = Course.query.get(e.course_id)
        if not course:
            continue
            
        assignments = Assignment.query.filter_by(course_id=course.id).all()

        progress = StudentProgress.query.filter_by(
            user_id=student_id,
            course_id=course.id
        ).first()

        # Get submissions for this student once
        student_submissions = Submission.query.filter_by(student_id=student_id).all()
        submitted_assignment_ids = {s.assignment_id for s in student_submissions}

        today = datetime.utcnow().strftime('%Y-%m-%d')
        start_date_str = course.start_date  # Expected "YYYY-MM-DD"
        
        try:
            start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d')
        except:
            start_date_obj = datetime.utcnow()

        required_count = get_required_assignments(course.duration)
        assignments_list = []
        
        # Get actual assignments and map them by week number
        actual_assignments = {a.week_number: a for a in assignments}

        can_reveal_next = True
        completed_count = 0

        for i in range(1, required_count + 1):
            # Calculate expected due date for this week (+i weeks)
            expected_due_date = (start_date_obj + timedelta(weeks=i)).strftime('%Y-%m-%d')
            
            real_a = actual_assignments.get(i)
            # Determine previous assignment's due date
            prev_due_date_obj = start_date_obj + timedelta(weeks=i-1)
            is_past_prev_due_date = datetime.utcnow() >= prev_due_date_obj

            if i == 1:
                is_data_revealed = True
            else:
                # Rule: Reveal content as soon as previous is submitted (User Request: "unmask wht the assignment is")
                is_data_revealed = can_reveal_next

            # Define variables that were missing
            is_submitted = real_a.id in submitted_assignment_ids if real_a else False
            target_due_date = real_a.due_date if (real_a and real_a.due_date) else expected_due_date

            
            # Submittability logic: 
            # - Must be revealed
            # - Must be a real assignment (not a placeholder)
            # - Must not already be submitted
            # - Rule: Submission button unlocks only after previous due date ("submission button should work only when last assignment due is done")
            is_unlocked_by_date = (i == 1) or is_past_prev_due_date
            is_submittable = is_data_revealed and (real_a is not None) and not is_submitted and is_unlocked_by_date
            
            assignments_list.append({
                "id": real_a.id if real_a else None,
                "title": (real_a.title if real_a else "Pending Trainer Upload") if is_data_revealed else "Locked Assignment",
                "week_number": i,
                "due_date": target_due_date if is_data_revealed else "Hidden",
                "is_unlocked": is_submittable, 
                "is_data_revealed": is_data_revealed,
                "is_submitted": is_submitted,
                "feedback": next((s.feedback for s in student_submissions if s.assignment_id == real_a.id), None) if real_a else None,
                "is_placeholder": real_a is None
            })

            # The next assignment can only be revealed if this one is submitted
            can_reveal_next = is_data_revealed and is_submitted
            if is_submitted:
                completed_count += 1

        # Calculate dynamic progress based on actual assignments
        # Use required_count as total to reflect Course Progress
        total_count = required_count 
        progress_val = int((completed_count / max(total_count, 1)) * 100)
        dynamic_progress = min(progress_val, 100)

        # Check if certificate already exists
        cert_record = Certificate.query.filter_by(user_id=student_id, course_id=course.id).first()
        cert_url = cert_record.certificate_url if cert_record else None

        response.append({
            "course_id": course.id,
            "course": course.name,
            "progress": dynamic_progress,
            "assignments": assignments_list,
            "can_generate_certificate": dynamic_progress >= 100,
            "certificate_url": cert_url,
            "total_assignments": total_count,
            "assignments_completed": completed_count
        })

    return jsonify({
        "courses": response,
        "study_streak": student.current_streak,
        "overall_grade": overall_grade_str
    }), 200


@student_bp.route("/student/submit", methods=["POST"])
@jwt_required()
def submit_assignment():
    student_id = int(get_jwt_identity())
    assignment_id = int(request.form.get("assignment_id"))
    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filename = secure_filename(file.filename)
    path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(path)

    submission = Submission(
        assignment_id=assignment_id,
        student_id=student_id,
        file_path=path,
        submitted_at=datetime.utcnow()
    )

    db.session.add(submission)

    assignment = Assignment.query.get(assignment_id)
    progress = StudentProgress.query.filter_by(
        user_id=student_id,
        course_id=assignment.course_id
    ).first()

    if progress:
        # Re-calculate unique submissions count for this student+course
        all_subs = Submission.query.filter_by(student_id=student_id).all()
        course_asgn_ids = {a.id for a in Assignment.query.filter_by(course_id=assignment.course_id).all()}
        unique_submitted = len({s.assignment_id for s in all_subs if s.assignment_id in course_asgn_ids})
        
        course = Course.query.get(assignment.course_id)
        required = get_required_assignments(course.duration) if course else 4
        
        progress.assignments_completed = unique_submitted
        progress.total_assignments = required
        new_progress = int((unique_submitted / max(required, 1)) * 100)
        progress.progress = min(new_progress, 100)
        if progress.progress >= 100:
            progress.status = "Completed"

    db.session.commit()
    return jsonify({"message": "Assignment submitted"}), 200

@student_bp.route("/student/course/<int:course_id>/resources", methods=["GET"])
@jwt_required()
def get_course_resources(course_id):
    resources = CourseResource.query.filter_by(course_id=course_id).all()
    return jsonify([{
        "id": r.id,
        "title": r.title,
        "type": r.type,
        "url": r.url
    } for r in resources]), 200


def generate_certificate_pdf(student_name, course_name, output_path):
    c = canvas.Canvas(output_path, pagesize=landscape(letter))
    width, height = landscape(letter)

    # Background Color (Subtle Cream)
    c.setFillColor(HexColor("#fdfbf7"))
    c.rect(0, 0, width, height, fill=1)

    # Border
    c.setStrokeColor(HexColor("#4f46e5"))
    c.setLineWidth(5)
    c.rect(20, 20, width-40, height-40)
    
    c.setStrokeColor(HexColor("#cbd5e1"))
    c.setLineWidth(1)
    c.rect(30, 30, width-60, height-60)

    # Title
    c.setFont("Helvetica-Bold", 40)
    c.setFillColor(HexColor("#1e293b"))
    c.drawCentredString(width/2, height - 150, "CERTIFICATE OF COMPLETION")

    # Body
    c.setFont("Helvetica", 18)
    c.drawCentredString(width/2, height - 220, "This is to certify that")

    c.setFont("Helvetica-Bold", 32)
    c.setFillColor(HexColor("#4f46e5"))
    c.drawCentredString(width/2, height - 280, student_name.upper())

    c.setFont("Helvetica", 18)
    c.setFillColor(HexColor("#1e293b"))
    c.drawCentredString(width/2, height - 340, "has successfully completed the course")

    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width/2, height - 400, course_name)

    # Footer
    c.setFont("Helvetica", 12)
    date_str = datetime.utcnow().strftime("%B %d, %Y")
    c.drawString(100, 100, f"Date: {date_str}")
    
    # Signature Placeholder
    c.line(width - 250, 100, width - 100, 100)
    c.drawCentredString(width - 175, 80, "Authorized Signatory")

    c.save()

@student_bp.route("/student/certificate/<int:course_id>", methods=["POST"])
@jwt_required()
def generate_certificate(course_id):
    student_id = int(get_jwt_identity())
    student = User.query.get(student_id)
    course = Course.query.get(course_id)
    
    if not course or not student:
        return jsonify({"error": "Resource not found"}), 404
        
    # Check eligibility (must be 100% progress)
    submissions = Submission.query.filter_by(student_id=student_id).all()
    course_assignments = Assignment.query.filter_by(course_id=course_id).all()
    course_assignment_ids = {a.id for a in course_assignments}
    completed_count = len({s.assignment_id for s in submissions if s.assignment_id in course_assignment_ids})
    
    required_count = get_required_assignments(course.duration)
    if completed_count < required_count:
        return jsonify({"error": f"Certificate locked. Please complete all {required_count} assignments."}), 403

    # Generate filename
    CERT_FOLDER = "certificates"
    os.makedirs(CERT_FOLDER, exist_ok=True)
    filename = f"cert_{student_id}_{course_id}.pdf"
    filepath = os.path.join(CERT_FOLDER, filename)

    # Check if already exists
    existing = Certificate.query.filter_by(user_id=student_id, course_id=course_id).first()
    
    # Generate Actual PDF
    try:
        generate_certificate_pdf(student.name, course.name, filepath)
    except Exception as e:
        return jsonify({"error": f"Failed to generate PDF: {str(e)}"}), 500

    if not existing:
        cert = Certificate(
            user_id=student_id,
            course_id=course_id,
            certificate_url=f"/certificates/{filename}"
        )
        db.session.add(cert)
        db.session.commit()
        return jsonify({"message": "Certificate generated successfully", "url": cert.certificate_url}), 201
    else:
        return jsonify({"message": "Certificate updated", "url": existing.certificate_url}), 200