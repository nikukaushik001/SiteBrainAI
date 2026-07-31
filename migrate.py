import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "backend", "database.db")
if not os.path.exists(db_path):
    print("Database not found at", db_path)
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
try:
    cursor.execute("ALTER TABLE tenants ADD COLUMN allowed_domains TEXT;")
    conn.commit()
    print("Added allowed_domains column successfully.")
except sqlite3.OperationalError as e:
    print("Column might already exist or error:", e)
conn.close()
