import sys
import socket
import pymysql

print("Checking DB with minimal timeout...", flush=True)

try:
    print("Socket 127.0.0.1:3306...", flush=True)
    with socket.create_connection(('127.0.0.1', 3306), timeout=2) as s:
        print("✅ Socket CONNECTED", flush=True)
except Exception as e:
    print(f"❌ Socket FAILED: {e}", flush=True)

try:
    print("Socket localhost:3306...", flush=True)
    with socket.create_connection(('localhost', 3306), timeout=2) as s:
        print("✅ Socket CONNECTED", flush=True)
except Exception as e:
    print(f"❌ Socket FAILED: {e}", flush=True)
    
try:
    print("PyMySQL test...", flush=True)
    conn = pymysql.connect(
        host='127.0.0.1',
        port=3306,
        user='root',
        password='',
        connect_timeout=2
    )
    print("✅ PyMySQL CONNECTED", flush=True)
    conn.close()
except Exception as e:
    print(f"❌ PyMySQL FAILED: {e}", flush=True)

