"""
Simple script to check face detection data in database
Run: python check_face_data.py
"""

import psycopg2
from datetime import datetime, timedelta

# Database connection
conn = psycopg2.connect(
    host="127.0.0.1",
    port=5432,
    database="fumorive",
    user="postgres",
    password="12345"
)

cursor = conn.cursor()

print("\n" + "="*60)
print("🔍 FACE DETECTION DATA CHECK")
print("="*60 + "\n")

# 1. Total face events
cursor.execute("SELECT COUNT(*) FROM face_detection_events")
total = cursor.fetchone()[0]
print(f"📊 Total Face Events: {total}")

# 2. Events in last 5 minutes
five_min_ago = datetime.now() - timedelta(minutes=5)
cursor.execute(
    "SELECT COUNT(*) FROM face_detection_events WHERE timestamp > %s",
    (five_min_ago,)
)
recent = cursor.fetchone()[0]
print(f"⏱️  Events in last 5 min: {recent}")

# 3. Latest 5 events
cursor.execute("""
    SELECT 
        timestamp,
        eye_aspect_ratio,
        face_fatigue_score,
        blink_count,
        yawning
    FROM face_detection_events 
    ORDER BY timestamp DESC 
    LIMIT 5
""")

print(f"\n📝 Latest 5 Events:\n")
print(f"{'Timestamp':<25} {'EAR':<8} {'Fatigue':<10} {'Blinks':<8} {'Yawn'}")
print("-" * 70)

for row in cursor.fetchall():
    timestamp, ear, fatigue, blinks, yawning = row
    ear_str = f"{ear:.3f}" if ear else "N/A"
    fatigue_str = f"{fatigue:.1f}%" if fatigue else "N/A"
    blinks_str = str(blinks) if blinks else "0"
    yawn_str = "YES" if yawning else "NO"
    
    print(f"{str(timestamp):<25} {ear_str:<8} {fatigue_str:<10} {blinks_str:<8} {yawn_str}")

# 4. Sessions with face data
cursor.execute("""
    SELECT 
        s.id,
        s.session_name,
        s.started_at,
        COUNT(f.id) as event_count
    FROM sessions s
    LEFT JOIN face_detection_events f ON s.id = f.session_id
    WHERE s.started_at > %s
    GROUP BY s.id, s.session_name, s.started_at
    ORDER BY s.started_at DESC
    LIMIT 5
""", (five_min_ago,))

print(f"\n📋 Recent Sessions:\n")
print(f"{'Session Name':<40} {'Started':<20} {'Events'}")
print("-" * 70)

for row in cursor.fetchall():
    sid, name, started, count = row
    print(f"{name[:39]:<40} {str(started)[:19]:<20} {count}")

print("\n" + "="*60)

if recent > 0:
    print("✅ SUCCESS! Face detection data is being recorded!")
else:
    print("⚠️  No recent data. Make sure:")
    print("   1. Frontend face recognition is running")
    print("   2. Camera is started")
    print("   3. Face is detected")

print("="*60 + "\n")

cursor.close()
conn.close()


