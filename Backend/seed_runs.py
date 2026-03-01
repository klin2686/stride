"""
Seed script: inserts fake run history for the first user in the DB.
Run from the Backend/ directory:
    python seed_runs.py
"""

from datetime import datetime, timedelta
import random
from database import Base, engine, SessionLocal
from models import User, Run

# ── Make sure tables exist ──
Base.metadata.create_all(bind=engine)

# ── Add new metric columns if they don't exist yet (SQLite ALTER TABLE) ──
new_columns = [
    ("avg_cadence",  "REAL"),
    ("avg_gct",      "REAL"),
    ("avg_shock",    "REAL"),
    ("heel_pct",     "REAL"),
    ("midfoot_pct",  "REAL"),
    ("forefoot_pct", "REAL"),
]
with engine.connect() as conn:
    existing = {row[1] for row in conn.execute(
        __import__("sqlalchemy").text("PRAGMA table_info(runs)")
    )}
    for col_name, col_type in new_columns:
        if col_name not in existing:
            conn.execute(__import__("sqlalchemy").text(
                f"ALTER TABLE runs ADD COLUMN {col_name} {col_type}"
            ))
            print(f"   ↳ Added column: {col_name}")
    conn.commit()

db = SessionLocal()

# ── Find all users ──
users = db.query(User).all()
if not users:
    print("❌  No users found. Register an account first, then re-run this script.")
    db.close()
    exit(1)

# ── Fake run data ──
runs_data = [
    # (days_ago, distance_m, duration_s, avg_cadence, avg_gct, avg_shock, heel_pct, midfoot_pct, forefoot_pct)
    (1,   4823,  1740, 178.2, 238.5, 3.12, 12.0, 74.0, 14.0),
    (3,   8046,  3180, 174.8, 251.0, 3.45, 22.5, 61.0, 16.5),
    (6,   3218,  1320, 181.0, 229.3, 2.98, 8.0,  82.0, 10.0),
    (9,   6437,  2640, 172.5, 265.8, 3.72, 31.0, 54.0, 15.0),
    (12,  9656,  3900, 176.3, 244.1, 3.21, 18.5, 68.0, 13.5),
    (15,  4023,  1680, 179.6, 235.7, 3.05, 10.0, 79.0, 11.0),
    (20,  5000,  2100, 175.0, 256.2, 3.55, 25.0, 60.0, 15.0),
    (28,  3000,  1260, 183.1, 222.4, 2.88,  5.0, 86.0,  9.0),
]

base_time = datetime.now()

for user in users:
    print(f"\n✅  Seeding runs for user: {user.username} (id={user.id})")

    # Remove old seed data for this user so we don't double-up
    db.query(Run).filter(Run.user_id == user.id).delete()
    db.commit()

    for (days_ago, dist, dur, cad, gct, shock, heel, mid, fore) in runs_data:
        # Vary the time-of-day a little
        hour = random.randint(6, 19)
        minute = random.randint(0, 59)
        run_date = (base_time - timedelta(days=days_ago)).replace(
            hour=hour, minute=minute, second=0, microsecond=0
        )

        # Calculate pace string (min/mi)
        miles = dist / 1609.344
        pace_s = dur / miles
        pace_m = int(pace_s // 60)
        pace_sec = int(pace_s % 60)
        avg_pace = f"{pace_m}:{str(pace_sec).zfill(2)}"

        run = Run(
            user_id=user.id,
            date=run_date,
            distance_m=dist,
            duration_s=dur,
            avg_pace=avg_pace,
            avg_cadence=cad,
            avg_gct=gct,
            avg_shock=shock,
            heel_pct=heel,
            midfoot_pct=mid,
            forefoot_pct=fore,
        )
        db.add(run)
        print(f"   + {run_date.strftime('%b %d')}  {miles:.2f} mi  {avg_pace}/mi  cad={cad}  gct={gct}ms  shock={shock}G  mid={mid}%")

    db.commit()

db.close()
print("\n✅  Done! Restart the backend if needed, then open /runs in the app.")
