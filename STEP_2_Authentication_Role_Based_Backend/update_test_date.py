from models import Assignment
from extensions import db
from app import app
import sys

def update_week2():
    with app.app_context():
        # Find all Week 2 assignments and update them to today
        today_date = "2026-01-09"
        assignments = Assignment.query.filter_by(week_number=2).all()
        if not assignments:
            print("No Week 2 assignments found.")
            # Let's check all assignments to see what's available
            all_a = Assignment.query.all()
            print(f"Total assignments in DB: {len(all_a)}")
            for a in all_a:
                print(f"ID: {a.id}, Week: {a.week_number}, Title: {a.title}")
            return

        for a in assignments:
            a.due_date = today_date
            print(f"Updated Assignment ID {a.id} (Course {a.course_id}) due date to {today_date}")
        
        db.session.commit()
        print("Successfully committed changes.")

if __name__ == "__main__":
    update_week2()
