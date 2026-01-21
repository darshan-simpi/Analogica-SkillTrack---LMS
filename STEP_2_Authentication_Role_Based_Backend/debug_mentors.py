from app import app, db
from models import User, Course, StudentProgress

def debug_mentors():
    with app.app_context():
        print("\n--- DEBUGGING MENTORS ---")
        
        # 1. List All Trainers
        trainers = User.query.filter_by(role="TRAINER").all()
        print(f"\n[TRAINERS FOUND: {len(trainers)}]")
        for t in trainers:
            print(f"ID: {t.id} | Name: '{t.name}' | Email: {t.email}")

        # 2. List All Courses and their Mentor Names
        courses = Course.query.all()
        print(f"\n[COURSES FOUND: {len(courses)}]")
        for c in courses:
            print(f"ID: {c.id} | Name: {c.name} | Mentor Field: '{c.mentor_name}'")

        # 3. Check for specific student (if known, or we can check enrollments)
        # Let's check first student found
        student = User.query.filter_by(role="STUDENT").first()
        if student:
            print(f"\n[CHECKING STUDENT: {student.name} (ID: {student.id})]")
            enrollments = StudentProgress.query.filter_by(user_id=student.id).all()
            print(f"Enrolled Course IDs: {[e.course_id for e in enrollments]}")
            
            for e in enrollments:
                c = Course.query.get(e.course_id)
                if c:
                    print(f"  -> Course: {c.name} | Mentor: '{c.mentor_name}'")
                    # Try to match
                    trainer = User.query.filter_by(name=c.mentor_name, role="TRAINER").first()
                    if trainer:
                        print(f"     ✅ MATCH FOUND: Trainer ID {trainer.id}")
                    else:
                        print(f"     ❌ NO MATCH for name '{c.mentor_name}' in Trainers table")
                        # Fuzzy search check?
                        similar = User.query.filter(User.name.like(f"%{c.mentor_name}%")).all()
                        if similar:
                             print(f"     Possibly meant: {[s.name for s in similar]}")

        else:
            print("\nNo students found to test.")

if __name__ == "__main__":
    debug_mentors()
