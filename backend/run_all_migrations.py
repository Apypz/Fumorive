import sys
from pathlib import Path
from sqlalchemy import text

# Add the parent directory to sys.path to allow importing from app
sys.path.append(str(Path(__file__).parent))

from app.db.database import engine

def run_sql_file(filepath):
    print(f"Running {filepath.name}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    try:
        with engine.connect() as conn:
            # Execute statement by statement
            for statement in sql.split(';'):
                statement = statement.strip()
                if statement and not statement.startswith('--') and not statement.startswith('/*'):
                    try:
                        conn.execute(text(statement))
                    except Exception as stmt_err:
                        print(f"   ⚠️ Warning on statement: {stmt_err}")
                        # Continue execution for other statements
            conn.commit()
        print(f"✅ Successfully ran {filepath.name}")
    except Exception as e:
        print(f"❌ Failed to run {filepath.name}: {e}")

if __name__ == "__main__":
    base_dir = Path(__file__).parent
    print("🚀 Starting database migration process...")
    
    # Run init_schema first
    init_schema = base_dir / "init_schema.sql"
    if init_schema.exists():
        run_sql_file(init_schema)
    else:
        print(f"⚠️ {init_schema} not found!")
        
    # Run migrations in order
    migrations_dir = base_dir / "migrations"
    if migrations_dir.exists():
        migration_files = sorted([f for f in migrations_dir.glob("*.sql") if "rollback" not in f.name])
        for sql_file in migration_files:
            run_sql_file(sql_file)
            
    print("🎉 All migrations finished!")
