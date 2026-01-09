from models import Assignment, Course
from extensions import db
from app import app

def create_test_assignment():
    with app.app_context():
        # Ensure Course 1 exists and has a reasonable start date for testing
        course = Course.query.get(1)
        if course:
            course.start_date = "2025-12-26" # 2 weeks ago
            print(f"Updated Course {course.id} start date to {course.start_date}")

        # Create Week 2 assignment
        a2 = Assignment(
            course_id=1,
            title="Advanced Python Concepts",
            week_number=2,
            due_date="2026-01-09", # Today
            is_released=True
        )
        db.session.add(a2)
        db.session.commit()
        print(f"Created Week 2 assignment with ID {a2.id} and due date {a2.due_date}")

if __name__ == "__main__":
    create_test_assignment()
