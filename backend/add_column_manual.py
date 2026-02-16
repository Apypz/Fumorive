"""
Manually add name_manually_edited column to users table
"""
from app.db.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        # Add column
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN name_manually_edited BOOLEAN DEFAULT FALSE
        """))
        conn.commit()
        print("✅ Column added successfully!")
        
        # Verify
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'name_manually_edited'
        """))
        if result.fetchone():
            print("✅ Verified: name_manually_edited column exists!")
        else:
            print("❌ Column still not found after adding")
            
except Exception as e:
    print(f"❌ Error: {e}")
    raise
