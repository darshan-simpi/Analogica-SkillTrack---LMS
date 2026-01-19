from app import app, db
from models import TaskSubmission, Task, Internship

with app.app_context():
    subs = TaskSubmission.query.all()
    print(f"Total Submissions: {len(subs)}")
    for s in subs:
        print(f"Sub ID: {s.id}, TaskID: {s.task_id}, File: {s.file_path}")
        
    tasks = Task.query.all()
    print(f"Total Tasks: {len(tasks)}")
