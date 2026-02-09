import pymysql
from config import Config

def migrate_db():
    try:
        # Connect to the database
        # We need to parse the SQLALCHEMY_DATABASE_URI to get connection details
        # URI format: mysql+pymysql://root:@localhost/skilltrack
        # Simple parsing for this specific format
        uri = Config.SQLALCHEMY_DATABASE_URI
        parts = uri.split("://")[1].split("@")
        user_pass = parts[0].split(":")
        host_db = parts[1].split("/")
        
        user = user_pass[0]
        password = user_pass[1] if len(user_pass) > 1 else ""
        host = host_db[0]
        db_name = host_db[1]

        print(f"Connecting to database: {db_name} on {host} as {user}")
        
        connection = pymysql.connect(
            host=host,
            user=user,
            password=password,
            database=db_name,
            cursorclass=pymysql.cursors.DictCursor
        )

        with connection.cursor() as cursor:
            print("Checking current schema...")
            cursor.execute("DESCRIBE workshops")
            columns = [row['Field'] for row in cursor.fetchall()]
            
            # 1. Add 'location' if not exists
            if 'location' not in columns:
                print("Adding 'location' column...")
                cursor.execute("ALTER TABLE workshops ADD COLUMN location VARCHAR(150)")
            else:
                print("'location' column already exists.")

            # 2. Add 'start_date' if not exists
            if 'start_date' not in columns:
                print("Adding 'start_date' column...")
                cursor.execute("ALTER TABLE workshops ADD COLUMN start_date VARCHAR(50)")
            else:
                print("'start_date' column already exists.")

            # 3. Add 'end_date' if not exists
            if 'end_date' not in columns:
                print("Adding 'end_date' column...")
                cursor.execute("ALTER TABLE workshops ADD COLUMN end_date VARCHAR(50)")
            else:
                print("'end_date' column already exists.")

            # 4. Migrate data from 'date' to 'start_date' if 'date' exists
            if 'date' in columns:
                print("Migrating data from 'date' to 'start_date'...")
                cursor.execute("UPDATE workshops SET start_date = date WHERE start_date IS NULL OR start_date = ''")
                
                # Drop 'date' column
                print("Dropping old 'date' column...")
                cursor.execute("ALTER TABLE workshops DROP COLUMN date")
            
            connection.commit()
            print("Migration completed successfully!")

    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        if 'connection' in locals() and connection.open:
            connection.close()
            print("Database connection closed.")

if __name__ == "__main__":
    migrate_db()
