from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import os
from reportlab.lib.pagesizes import landscape, letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor

from models import Enrollment, Course, Assignment, Submission, StudentProgress, CourseResource, Certificate, User, Quiz, Question, QuizSubmission
from extensions import db
from utils import allowed_file

student_bp = Blueprint("student", __name__)

UPLOAD_FOLDER = "uploads"
def get_required_assignments(duration_str):
    if not duration_str:
        return 4
    try:
        # Match digits for flexible strings like "1month", "3 months", etc.
        import re
        match = re.search(r'(\d+)', str(duration_str))
        num = int(match.group(1)) if match else 1
        if num <= 0: num = 1
        
        low_dur = str(duration_str).lower()
        if "month" in low_dur:
            return num * 4
        elif "week" in low_dur:
            return num
        return 4
    except:
        return 4

@student_bp.route("/student/progress", methods=["GET"])
@jwt_required()
def student_progress():
    print("🚀 EXECUTING NEW student_progress CODE")
    try:
        student_id = int(get_jwt_identity())
        
        # Collect all course IDs
        enroll_ids = {e.course_id for e in Enrollment.query.filter_by(user_id=student_id).all()}
        prog_ids = {p.course_id for p in StudentProgress.query.filter_by(user_id=student_id).all()}
        all_course_ids = enroll_ids.union(prog_ids)
        
        response = []
        for cid in all_course_ids:
            course = Course.query.get(cid)
            if not course: continue
            
            # 1. Assignments Completed
            subs = Submission.query.filter_by(student_id=student_id).all()
            asgn_ids = {a.id for a in Assignment.query.filter_by(course_id=cid).all()}
            asgn_done = len({s.assignment_id for s in subs if s.assignment_id in asgn_ids})
            
            # 2. Quizzes Completed
            q_subs = QuizSubmission.query.filter_by(student_id=student_id).all()
            q_ids = {q.id for q in Quiz.query.filter_by(course_id=course.id).all()}
            quiz_done = len({s.quiz_id for s in q_subs if s.quiz_id in q_ids})
            
            # 3. Required Count
            req = get_required_assignments(course.duration)
            if not req or not isinstance(req, int) or req <= 0: 
                req = 4
            
            total_quizzes = len(q_ids) if len(q_ids) > 0 else req # Fallback to req if no quizzes in DB (logic choice)

            total_tasks = req * 2 # Asgn + Quiz (Approximation for progress bar)
            # Or better: total_tasks = req + total_quizzes? 
            # Sticking to previous logic for progress calc to avoid Regression, but fixing display data.
            
            done_tasks = asgn_done + quiz_done
            prog_val = int((done_tasks / max(total_tasks, 1)) * 100)
            
            # 4. Duration Safety
            raw_dur = str(course.duration) if (course.duration and str(course.duration).strip()) else "1 Month"

            item = {
                "course_id": course.id,
                "course": course.name,
                "course_name": course.name,
                "progress": min(prog_val, 100),
                "status": "Completed" if prog_val >= 100 else "On Track",
                "assignments_completed": asgn_done,
                "total_assignments": req,
                "quizzes_completed": quiz_done,
                "total_quizzes": total_quizzes, 
                "duration": raw_dur
            }
            response.append(item)

        print(f"DEBUG PROGRESS RESPONSE: {response}")
        return jsonify(response), 200
    except Exception as e:
        print(f"ERROR in student_progress: {str(e)}")
        # Return empty list or error to avoid crash
        return jsonify([]), 200

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
    
    import re
    from flask import current_app # Ensure this is imported
    
    grade_map = {"A+": 100, "A": 95, "A-": 90, "B+": 85, "B": 80, "B-": 75, "C": 70, "D": 60, "F": 0}

    for s in all_submissions:
        if s.grade:
            try:
                # 1. Try Map First (e.g. "A")
                sg = s.grade.strip().upper()
                if sg in grade_map:
                    valid_grades.append(grade_map[sg])
                    continue
                
                # 2. Try Regex (e.g. "90/100")
                match = re.search(r"(\d+(\.\d+)?)", str(s.grade))
                if match:
                    val = float(match.group(1))
                    if val <= 100: # Sanity check
                        valid_grades.append(val)
            except:
                pass 
    
    if len(valid_grades) > 0:
        overall_grade = int(sum(valid_grades) / len(valid_grades))
        overall_grade_str = f"{overall_grade}%"
    else:
        overall_grade_str = "N/A"

    # Merge course IDs from both sources
    enroll_ids = {e.course_id for e in Enrollment.query.filter_by(user_id=student_id).all()}
    prog_ids = {p.course_id for p in StudentProgress.query.filter_by(user_id=student_id).all()}
    all_course_ids = enroll_ids.union(prog_ids)
    
    response = []
    for cid in all_course_ids:
        course = Course.query.get(cid)
        if not course: continue
            
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
            # Determine previous assignment details for unlocking logic
            prev_a = actual_assignments.get(i-1) if i > 1 else None
            
            # PREVIOUS Logic: can_reveal_next = is_data_revealed and is_submitted
            # NEW Logic: Also check if PREVIOUS one's deadline has passed.
            
            is_prev_deadline_passed = True # Default for Week 1
            if i > 1:
                # Need to check Week i-1
                # If Week i-1 doesn't exist (placeholder), rely on generic date math?
                # User says "if it's due data didn't end yet".
                # If there IS a real assignment for i-1, check its due date.
                if prev_a and prev_a.due_date:
                    try:
                        p_date = datetime.strptime(prev_a.due_date, '%Y-%m-%d')
                        if datetime.utcnow().date() <= p_date.date():
                            is_prev_deadline_passed = False
                    except: pass
                else:
                    # Fallback if no specific assignment or date: Use calculated course timeline
                    prev_due_date_obj = start_date_obj + timedelta(weeks=i-1)
                    if datetime.utcnow() <= prev_due_date_obj:
                         is_prev_deadline_passed = False

            if i == 1:
                is_data_revealed = True
            else:
                # Rule: Reveal content only if previous submitted AND previous deadline passed
                is_data_revealed = can_reveal_next and is_prev_deadline_passed

            # Define variables that were missing
            is_submitted = real_a.id in submitted_assignment_ids if real_a else False
            target_due_date = real_a.due_date if (real_a and real_a.due_date) else expected_due_date

            # Submittability logic: 
            is_unlocked_by_date = (i == 1) or is_prev_deadline_passed
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
                "grade": next((s.grade for s in student_submissions if s.assignment_id == real_a.id), None) if real_a else None,
                "is_placeholder": real_a is None
            })

            # The next assignment can only be revealed if this one is submitted
            # AND (implicitly handled by next iteration) this one's deadline passed
            can_reveal_next = is_data_revealed and is_submitted
            if is_submitted:
                completed_count += 1

        # Get quizzes for this course
        quizzes = Quiz.query.filter_by(course_id=course.id).all()
        quiz_submissions = QuizSubmission.query.filter_by(student_id=student_id).all()
        submitted_quiz_ids = {s.quiz_id for s in quiz_submissions}
        
        quizzes_completed = 0
        for quiz in quizzes:
            if quiz.id in submitted_quiz_ids:
                quizzes_completed += 1

        # Calculate dynamic progress based on BOTH assignments and quizzes
        # User: "after completeing the assigned quizes and assignment then only he is eligible to get certificate"
        total_tasks = required_count * 2 # required_count assignments + required_count quizzes
        completed_tasks = completed_count + quizzes_completed
        progress_val = int((completed_tasks / max(total_tasks, 1)) * 100)
        dynamic_progress = min(progress_val, 100)

        # Check if certificate already exists AND is physically present
        cert_record = Certificate.query.filter_by(user_id=student_id, course_id=course.id).first()
        cert_url = None
        if cert_record and cert_record.certificate_url:
             # Verify file exists using ABSOLUTE path
             # certificate_url is like "/certificates/foo.pdf"
             # we need "C:/.../static/certificates/foo.pdf"
             lpath = cert_record.certificate_url.lstrip("/")
             expected_path = os.path.join(current_app.root_path, "static", lpath)
             
             if os.path.exists(expected_path):
                 cert_url = cert_record.certificate_url
             else:
                 # File missing, treat as not generated
                 cert_url = None

        # Dashboard sync
        final_duration = str(course.duration) if course.duration else "1 Month"

        response.append({
            "course_id": course.id,
            "course": course.name,
            "course_name": course.name,
            "progress": dynamic_progress,
            "assignments": assignments_list,
            "can_generate_certificate": dynamic_progress >= 100,
            "certificate_url": cert_url,
            "total_assignments": required_count,
            "assignments_completed": completed_count,
            "total_quizzes": required_count,
            "quizzes_completed": quizzes_completed,
            "duration": final_duration
        })

    return jsonify({
        "courses": response,
        "study_streak": student.current_streak,
        "overall_grade": overall_grade_str
    }), 200

# ================= QUIZ LOGIC =================
@student_bp.route("/student/course/<int:course_id>/quizzes", methods=["GET"])
@jwt_required()
def get_student_quizzes(course_id):
    student_id = int(get_jwt_identity())
    course = Course.query.get_or_404(course_id)
    
    quizzes = Quiz.query.filter_by(course_id=course_id).all()
    submissions = QuizSubmission.query.filter_by(student_id=student_id).all()
    submitted_quiz_ids = {s.quiz_id for s in submissions}
    
    # Sort quizzes by week
    quizzes = sorted(quizzes, key=lambda x: x.week_number)
    
    required_count = get_required_assignments(course.duration) # Reuse same logic
    
    result = []
    can_see_next = True
    
    for i in range(1, required_count + 1):
        q = next((quiz for quiz in quizzes if quiz.week_number == i), None)
        
        is_submitted = q.id in submitted_quiz_ids if q else False
        is_past_deadline = False
        
        if q and q.deadline:
            try:
                deadline_obj = datetime.strptime(q.deadline, '%Y-%m-%d')
                is_past_deadline = datetime.utcnow() >= (deadline_obj + timedelta(days=1))
            except: pass

        # Visibility Rule: shows only after previous deadline is completed
        # "each quize should visible to the student once the first quize deadline should be completed"
        # I interprets this as: Week N is visible if Week N-1's deadline has passed.
        # However, for Week 1, it should always be visible (or visible once course starts).
        
        is_visible = False
        if i == 1:
            is_visible = True
        else:
            # Check previous quiz's deadline
            prev_q = next((quiz for quiz in quizzes if quiz.week_number == i-1), None)
            if prev_q and prev_q.deadline:
                try:
                    prev_deadline = datetime.strptime(prev_q.deadline, '%Y-%m-%d')
                    # User: "once the first quize deadline should be completed"
                    if datetime.utcnow() >= (prev_deadline + timedelta(days=1)):
                        is_visible = True
                except: pass

        result.append({
            "id": q.id if q else None,
            "title": (q.title if q else "TBD") if is_visible else "Locked Quiz",
            "week_number": i,
            "deadline": q.deadline if (q and is_visible) else "Hidden",
            "is_visible": is_visible,
            "is_submitted": is_submitted,
            "score": next((s.score for s in submissions if s.quiz_id == q.id), None) if (q and is_submitted) else None,
            "total": next((s.total_questions for s in submissions if s.quiz_id == q.id), None) if (q and is_submitted) else None
        })

    return jsonify(result), 200

@student_bp.route("/student/quiz/<int:quiz_id>", methods=["GET"])
@jwt_required()
def get_quiz_details(quiz_id):
    quiz = Quiz.query.get_or_404(quiz_id)
    questions = [{
        "id": q.id,
        "text": q.text,
        "option_a": q.option_a,
        "option_b": q.option_b,
        "option_c": q.option_c,
        "option_d": q.option_d
    } for q in quiz.questions]
    
    return jsonify({
        "id": quiz.id,
        "title": quiz.title,
        "questions": questions
    }), 200

@student_bp.route("/student/quiz/<int:quiz_id>/submit", methods=["POST"])
@jwt_required()
def submit_quiz(quiz_id):
    student_id = int(get_jwt_identity())
    quiz = Quiz.query.get_or_404(quiz_id)
    data = request.get_json() # { answers: { question_id: 'A', ... } }
    
    if QuizSubmission.query.filter_by(student_id=student_id, quiz_id=quiz_id).first():
        return jsonify({"error": "Already submitted"}), 400

    score = 0
    total = len(quiz.questions)
    
    for q in quiz.questions:
        student_ans = data.get("answers", {}).get(str(q.id))
        if student_ans == q.correct_answer:
            score += 1
            
    submission = QuizSubmission(
        quiz_id=quiz_id,
        student_id=student_id,
        score=score,
        total_questions=total
    )
    db.session.add(submission)
    
    # Update StudentProgress DB record for Trainer Visibility
    progress = StudentProgress.query.filter_by(user_id=student_id, course_id=quiz.course_id).first()
    if progress:
        course = Course.query.get(quiz.course_id)
        req = get_required_assignments(course.duration)
        
        # Count all completed
        subs = Submission.query.filter_by(student_id=student_id).all()
        asgn_ids = {a.id for a in Assignment.query.filter_by(course_id=quiz.course_id).all()}
        asgn_done = len({s.assignment_id for s in subs if s.assignment_id in asgn_ids})
        
        q_subs = QuizSubmission.query.filter_by(student_id=student_id).all()
        q_ids = {q.id for q in Quiz.query.filter_by(course_id=quiz.course_id).all()}
        quiz_done = len({s.quiz_id for s in q_subs if s.quiz_id in q_ids})
        
        total_tasks = req * 2
        done_tasks = asgn_done + quiz_done
        progress.progress = min(int((done_tasks / max(total_tasks, 1)) * 100), 100)
        if progress.progress >= 100:
            progress.status = "Completed"

    db.session.commit()
    
    return jsonify({"message": "Quiz submitted", "score": score, "total": total}), 200


@student_bp.route("/student/submit", methods=["POST"])
@jwt_required()
def submit_assignment():
    student_id = int(get_jwt_identity())
    assignment = Assignment.query.get(assignment_id)
    if not assignment:
         return jsonify({"error": "Assignment not found"}), 404

    # ✅ DEADLINE ENFORCEMENT
    if assignment.due_date:
        try:
             due = datetime.strptime(assignment.due_date, '%Y-%m-%d')
             if datetime.utcnow().date() > due.date():
                 return jsonify({"error": f"Deadline passed ({assignment.due_date}). Submission rejected."}), 403
        except ValueError:
             pass

    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Allowed: PDF, ZIP, Documents. PNGs are not allowed."}), 400

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
        course = Course.query.get(assignment.course_id)
        req = get_required_assignments(course.duration)
        
        # Count all completed
        subs = Submission.query.filter_by(student_id=student_id).all()
        asgn_ids = {a.id for a in Assignment.query.filter_by(course_id=assignment.course_id).all()}
        asgn_done = len({s.assignment_id for s in subs if s.assignment_id in asgn_ids})
        
        q_subs = QuizSubmission.query.filter_by(student_id=student_id).all()
        q_ids = {q.id for q in Quiz.query.filter_by(course_id=assignment.course_id).all()}
        quiz_done = len({s.quiz_id for s in q_subs if s.quiz_id in q_ids})
        
        total_tasks = req * 2
        done_tasks = asgn_done + quiz_done
        progress.assignments_completed = asgn_done
        progress.total_assignments = req
        progress.progress = min(int((done_tasks / max(total_tasks, 1)) * 100), 100)
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
    # 1. Assignments
    submissions = Submission.query.filter_by(student_id=student_id).all()
    course_assignments = Assignment.query.filter_by(course_id=course_id).all()
    course_assignment_ids = {a.id for a in course_assignments}
    asgn_completed = len({s.assignment_id for s in submissions if s.assignment_id in course_assignment_ids})
    
    # 2. Quizzes
    quiz_subs = QuizSubmission.query.filter_by(student_id=student_id).all()
    course_quizzes = Quiz.query.filter_by(course_id=course_id).all()
    course_quiz_ids = {q.id for q in course_quizzes}
    quiz_completed = len({s.quiz_id for s in quiz_subs if s.quiz_id in course_quiz_ids})

    required_count = get_required_assignments(course.duration)
    
    # Must complete ALL required assignments AND ALL required quizzes
    if asgn_completed < required_count or quiz_completed < required_count:
        return jsonify({
            "error": f"Certificate locked. You must complete all {required_count} assignments AND all {required_count} quizzes."
        }), 403

    # Generate filename
    CERT_FOLDER = os.path.join(current_app.root_path, "static", "certificates")
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

    cert_url = f"/certificates/{filename}"

    if not existing:
        cert = Certificate(
            user_id=student_id,
            course_id=course_id,
            certificate_url=cert_url
        )
        db.session.add(cert)
        db.session.commit()
        return jsonify({"message": "Certificate generated successfully", "url": cert.certificate_url}), 201
    else:
        existing.certificate_url = cert_url
        db.session.commit()
        return jsonify({"message": "Certificate updated", "url": existing.certificate_url}), 200