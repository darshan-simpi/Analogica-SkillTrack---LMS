from app import app, db
from models import Task, Enrollment, User

with app.app_context():
    print("--- FIXING TASKS ---")
    
    # Get all tasks that belong to an internship
    tasks = Task.query.filter(Task.internship_id.isnot(None)).all()
    
    fixed_count = 0
    
    for t in tasks:
        # Find who SHOULD be assigned (The intern enrolled in this internship)
        enrollment = Enrollment.query.filter_by(internship_id=t.internship_id).first()
        
        if not enrollment:
            print(f"Skipping Task {t.id}: No enrollment found for Internship {t.internship_id}")
            continue
            
        correct_user_id = enrollment.user_id
        
        if t.assigned_to != correct_user_id:
            old_assigned = t.assigned_to
            t.assigned_to = correct_user_id
            print(f"FIXED Task {t.id}: Reassigned from User {old_assigned} to User {correct_user_id}")
            fixed_count += 1
            
    if fixed_count > 0:
        db.session.commit()
        print(f"Successfully fixed {fixed_count} tasks.")
    else:
        print("No tasks needed fixing.")
