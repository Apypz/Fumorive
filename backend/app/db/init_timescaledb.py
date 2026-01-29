"""
Initialize TimescaleDB Hypertables
This script creates hypertables for time-series data optimization

Run this after creating initial database tables:
python -m app.db.init_timescaledb
"""

from sqlalchemy import text
from app.db.database import engine
from app.core.config import settings


def create_hypertables():
    """
    Convert regular tables to TimescaleDB hypertables.
    Hypertables provide automatic partitioning for time-series data.
    """
    
    with engine.connect() as conn:
        print("🔧 Initializing TimescaleDB extension...")
        
        # Enable TimescaleDB extension
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb;"))
            conn.commit()
            print("✅ TimescaleDB extension enabled")
        except Exception as e:
            print(f"⚠️  TimescaleDB extension might already exist: {e}")
        
        # Convert tables to hypertables
        hypertables = [
            ("eeg_data", "timestamp"),
            ("face_detection_events", "timestamp"),
            ("game_events", "timestamp"),
            ("alerts", "timestamp"),
        ]
        
        for table_name, time_column in hypertables:
            try:
                print(f"📊 Converting {table_name} to hypertable...")
                
                # Create hypertable
                conn.execute(text(f"""
                    SELECT create_hypertable(
                        '{table_name}',
                        '{time_column}',
                        chunk_time_interval => INTERVAL '{settings.TIMESCALE_CHUNK_INTERVAL}',
                        if_not_exists => TRUE
                    );
                """))
                conn.commit()
                
                print(f"✅ {table_name} is now a hypertable")
                
            except Exception as e:
                print(f"⚠️  Could not create hypertable for {table_name}: {e}")
        
        # Create composite indexes for better query performance
        print("\n🔍 Creating composite indexes...")
        
        indexes = [
            ("idx_eeg_session_timestamp", "eeg_data", ["session_id", "timestamp"]),
            ("idx_face_session_timestamp", "face_detection_events", ["session_id", "timestamp"]),
            ("idx_game_session_timestamp", "game_events", ["session_id", "timestamp"]),
            ("idx_alerts_session_timestamp", "alerts", ["session_id", "timestamp"]),
        ]
        
        for index_name, table_name, columns in indexes:
            try:
                columns_str = ", ".join(columns)
                conn.execute(text(f"""
                    CREATE INDEX IF NOT EXISTS {index_name}
                    ON {table_name} ({columns_str});
                """))
                conn.commit()
                print(f"✅ Index {index_name} created")
            except Exception as e:
                print(f"⚠️  Could not create index {index_name}: {e}")
        
        print("\n✨ TimescaleDB initialization complete!")


if __name__ == "__main__":
    print("=" * 60)
    print("Fumorive - TimescaleDB Setup")
    print("=" * 60)
    create_hypertables()
