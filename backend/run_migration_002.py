"""
Run migration to add name_manually_edited field to users table
"""
from app.db.database import engine
from sqlalchemy import text
from pathlib import Path

# Read migration SQL
migration_path = Path(__file__).parent / 'migrations' / '002_add_name_manually_edited.sql'
with open(migration_path, 'r') as f:
    sql = f.read()

# Execute migration
try:
    with engine.connect() as conn:
        # Split by statement and execute
        for statement in sql.split(';'):
            statement = statement.strip()
            if statement and not statement.startswith('--'):
                conn.execute(text(statement))
        conn.commit()
    print("✅ Migration completed successfully!")
    print("   Added column: name_manually_edited (BOOLEAN DEFAULT FALSE)")
    print("   Updated existing users to have name_manually_edited = FALSE")
except Exception as e:
    print(f"❌ Migration failed: {e}")
    raise
