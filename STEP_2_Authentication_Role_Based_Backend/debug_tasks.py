import sys
from app import app, db
from models import User, Task, Enrollment, Internship

with app.app_context():
    print("--- DEBUG START ---")
    interns = User.query.filter_by(role='INTERN').all()
    for i in interns:
        print(f"INTERN: {i.id} {i.name}")
        
    trainers = User.query.filter_by(role='TRAINER').all()
    for t in trainers:
        print(f"TRAINER: {t.id} {t.name}")

    enrollments = Enrollment.query.all()
    for e in enrollments:
        print(f"ENROLL: User{e.user_id} -> Intern{e.internship_id}")
        
    tasks = Task.query.all()
    for t in tasks:
        print(f"TASK: {t.id} Title:{t.title} AssignedTo:{t.assigned_to} Internship:{t.internship_id}")
        
    print("--- DEBUG END ---")
