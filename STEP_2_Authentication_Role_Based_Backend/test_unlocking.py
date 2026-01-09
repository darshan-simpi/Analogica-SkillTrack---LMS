from student_api import get_required_assignments
from models import Enrollment, Course, Assignment, Submission, User
from extensions import db
from app import app

def simulate_dashboard(student_id):
    with app.app_context():
        results = []
        enrollments = Enrollment.query.filter_by(user_id=student_id).all()
        for e in enrollments:
            course = Course.query.get(e.course_id)
            if not course: continue
            
            assignments = Assignment.query.filter_by(course_id=course.id).all()
            student_submissions = Submission.query.filter_by(student_id=student_id).all()
            submitted_assignment_ids = {s.assignment_id for s in student_submissions}
            
            required_count = get_required_assignments(course.duration)
            actual_assignments = {a.week_number: a for a in assignments}
            
            can_reveal_next = True
            assignments_list = []
            
            for i in range(1, required_count + 1):
                real_a = actual_assignments.get(i)
                is_submitted = real_a.id in submitted_assignment_ids if real_a else False
                
                is_data_revealed = True if i == 1 else can_reveal_next
                is_submittable = is_data_revealed and (real_a is not None) and not is_submitted
                
                assignments_list.append({
                    "week": i,
                    "revealed": is_data_revealed,
                    "unlocked": is_submittable,
                    "submitted": is_submitted,
                    "title": (real_a.title if real_a else "Placeholder") if is_data_revealed else "Locked"
                })
                
                can_reveal_next = is_data_revealed and is_submitted
            results.append({"course": course.name, "list": assignments_list})
        return results

if __name__ == "__main__":
    res = simulate_dashboard(4)
    for r in res:
        print(f"Course: {r['course']}")
        for a in r['list'][:5]:
            print(f"  W{a['week']}: Rev={a['revealed']}, Unl={a['unlocked']}, Sub={a['submitted']}, Title={a['title']}")
