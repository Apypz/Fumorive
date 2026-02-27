"""Check if name_manually_edited column exists in users table"""
from app.db.database import engine
from sqlalchemy import text

conn = engine.connect()
result = conn.execute(text("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position
"""))

columns = [row[0] for row in result]
print("Current columns in users table:")
for col in columns:
    print(f"  - {col}")

print(f"\nTotal columns: {len(columns)}")
print(f"Has name_manually_edited? {'name_manually_edited' in columns}")

conn.close()
