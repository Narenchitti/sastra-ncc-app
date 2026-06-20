import sqlite3
import os
import uuid
from typing import List, Optional
import bcrypt
from ..schemas.models import UserBase, EventBase, PermissionBase, AchievementBase, AttendanceBase

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db.sqlite3")

# pwd_context removed

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create tables and seed initial data if DB is empty."""
    conn = get_connection()
    cursor = conn.cursor()

    # Create users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        rank TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cadet',
        batch_year INTEGER NOT NULL,
        regimental_number TEXT,
        registration_number TEXT,
        dob TEXT,
        year_branch TEXT,
        hostel_info TEXT,
        camp_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'APPROVED',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Create events
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        location TEXT NOT NULL,
        type TEXT NOT NULL
    )
    """)

    # Create permissions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        cadet_id TEXT NOT NULL,
        cadet_name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        reason TEXT NOT NULL,
        evidence_url TEXT,
        status TEXT NOT NULL,
        suo_comment TEXT,
        ano_comment TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Create achievements
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        cadet_id TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        end_date TEXT,
        category TEXT NOT NULL,
        location TEXT,
        description TEXT NOT NULL,
        certificate_url TEXT,
        status TEXT NOT NULL,
        is_verified INTEGER DEFAULT 0,
        ano_comment TEXT
    )
    """)

    # Create attendance
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        event_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        marked_by TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (event_id, user_id)
    )
    """)

    # Create unit_config
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS unit_config (
        id TEXT PRIMARY KEY,
        permission_manager_id TEXT,
        updated_by TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Create inquiries
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inquiries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        reply_message TEXT,
        subscribed INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()

    # Schema migration: check and add columns if they do not exist
    try:
        cursor.execute("ALTER TABLE permissions ADD COLUMN ai_status TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE permissions ADD COLUMN ai_remarks TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'APPROVED'")
    except Exception:
        pass
    conn.commit()

    # Seed if empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        print("Initializing local SQLite database with seed data...")
        # 16 Cadets from seed_cadets.py
        CADETS = [
            {"name": "A B VENKATARAMANAN",           "email": "venkataramanan@sastra.ncc", "plain_password": "127009001", "rank": "CUO",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023581", "registration_number": "127009001", "dob": "21-05-2005", "year_branch": "III Year, B.Tech. Mechanical Engineering",                               "hostel_info": "Vinaya Block-1, S-239", "camp_count": 0},
            {"name": "GONAGALA CHAYA DURGA PRASAD",  "email": "durgaprasad@sastra.ncc",    "plain_password": "127180021", "rank": "CSM",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023586", "registration_number": "127180021", "dob": "13-11-2005", "year_branch": "III Year, B.Tech. Electronics Engineering (VLSI Design & Technology)", "hostel_info": "Vinaya Block-1, S-121", "camp_count": 0},
            {"name": "BALAJI A",                     "email": "balaji@sastra.ncc",         "plain_password": "128087010", "rank": "SGT",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023569", "registration_number": "128087010", "dob": "10-02-2005", "year_branch": "III Year, BA LLB (Hons)",                                               "hostel_info": "Day Scholar",            "camp_count": 0},
            {"name": "BONTHALA VARUN",               "email": "varun@sastra.ncc",          "plain_password": "127003042", "rank": "SGT",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA011264", "registration_number": "127003042", "dob": "22-10-2005", "year_branch": "III Year, B.Tech. Computer Science & Engineering",                      "hostel_info": "Vinaya Block-1, S-111", "camp_count": 0},
            {"name": "MENEDI NAGA PHANINDRA",        "email": "phanindra@sastra.ncc",      "plain_password": "127009080", "rank": "SGT",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023641", "registration_number": "127009080", "dob": "06-02-2004", "year_branch": "III Year, B.Tech. Mechanical Engineering",                               "hostel_info": "Vinaya Block-1, S-006", "camp_count": 0},
            {"name": "NAREN CHITTIBABU",             "email": "naren@sastra.ncc",          "plain_password": "127018037", "rank": "CPL",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA011267", "registration_number": "127018037", "dob": "10-08-2005", "year_branch": "III Year, B.Tech. Computer Science & Business Systems",                  "hostel_info": "Vinaya Block-1, I-211", "camp_count": 0},
            {"name": "ASHWIN M S",                   "email": "ashwin@sastra.ncc",         "plain_password": "127015010", "rank": "CPL",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023638", "registration_number": "127015010", "dob": "03-02-2005", "year_branch": "III Year, B.Tech. Information Technology",                               "hostel_info": "Vinaya Block-1, I-111", "camp_count": 0},
            {"name": "HARIHARA BALASUBRAMANIAM A",   "email": "harihara@sastra.ncc",       "plain_password": "127161019", "rank": "CPL",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA010907", "registration_number": "127161019", "dob": "09-10-2005", "year_branch": "III Year, B.Tech. Mechanical Engineering (Digital Manufacturing)",        "hostel_info": "Vinaya Block-1, I-037", "camp_count": 0},
            {"name": "VASANTHAN S S",                "email": "vasanthan@sastra.ncc",      "plain_password": "127003297", "rank": "CPL",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA011272", "registration_number": "127003297", "dob": "27-05-2006", "year_branch": "III Year, B.Tech. Computer Science & Engineering",                      "hostel_info": "Anasuya AH303",         "camp_count": 0},
            {"name": "RAMANUJA C S",                 "email": "ramanuja@sastra.ncc",       "plain_password": "127001043", "rank": "CPL",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023565", "registration_number": "127001043", "dob": "27-03-2006", "year_branch": "III Year, B.Tech. Civil Engineering",                                   "hostel_info": "Vinaya Block-1, S-107", "camp_count": 0},
            {"name": "S GIRISH RAGHAVAN",            "email": "girish@sastra.ncc",         "plain_password": "127009121", "rank": "L/CPL", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA011255", "registration_number": "127009121", "dob": "25-06-2005", "year_branch": "III Year, B.Tech. Mechanical Engineering",                               "hostel_info": "Vinaya Block-1, I-004", "camp_count": 0},
            {"name": "VINNUBAN B",                   "email": "vinnuban@sastra.ncc",       "plain_password": "127014062", "rank": "L/CPL", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023636", "registration_number": "127014062", "dob": "05-06-2005", "year_branch": "III Year, B.Tech. Information Communication Technology",                 "hostel_info": "Vinaya Block-1, S-116", "camp_count": 0},
            {"name": "SUDDAMALLA VENKATA RAGHAVA REDDY", "email": "raghava@sastra.ncc",   "plain_password": "126160055", "rank": "L/CPL", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023575", "registration_number": "126160055", "dob": "06-05-2004", "year_branch": "IV Year, B.Tech. Electronics & Communication Engineering (CPS)",         "hostel_info": "Vinaya Block-2, I-261", "camp_count": 0},
            {"name": "THARUN PRASAD M",              "email": "tharun@sastra.ncc",         "plain_password": "127009158", "rank": "CDT",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023640", "registration_number": "127009158", "dob": "30-04-2005", "year_branch": "III Year, B.Tech. Mechanical Engineering",                               "hostel_info": "Vinaya Block-1, I-007", "camp_count": 0},
            {"name": "GURUH KARTHIC G",              "email": "guruh@sastra.ncc",          "plain_password": "127015033", "rank": "CDT",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA011259", "registration_number": "127015033", "dob": "31-05-2005", "year_branch": "III Year, B.Tech. Information Technology",                               "hostel_info": "Vinaya Block-1, I-114", "camp_count": 0},
            {"name": "SHREERAAM J",                  "email": "shreeraam@sastra.ncc",      "plain_password": "126003247", "rank": "CDT",   "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023630", "registration_number": "126003247", "dob": "30-05-2005", "year_branch": "IV Year, B.Tech. Computer Science & Engineering",                      "hostel_info": "Day Scholar",            "camp_count": 0},
        ]
        
        # Add Capt. ANO Officer
        ANO_USER = {
            "name": "Capt. ANO Officer",
            "email": "ano@sastra.ncc",
            "plain_password": "12345678",
            "rank": "Captain",
            "role": "ANO",
            "batch_year": 0,
            "regimental_number": "ANO/2023/1001",
            "registration_number": "ANO/1001",
            "dob": "01-01-1980",
            "year_branch": "Faculty, Associate NCC Officer",
            "hostel_info": "Staff Quarters",
            "camp_count": 0
        }

        # Insert ANO
        ano_id = "6ced2391-0526-446a-bf3f-32565eb09a0d"
        hashed_ano_pwd = bcrypt.hashpw(ANO_USER["plain_password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        cursor.execute("""
        INSERT INTO users (id, name, email, password, rank, role, batch_year, regimental_number, registration_number, dob, year_branch, hostel_info, camp_count, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')
        """, (ano_id, ANO_USER["name"], ANO_USER["email"], hashed_ano_pwd, ANO_USER["rank"], ANO_USER["role"],
              ANO_USER["batch_year"], ANO_USER["regimental_number"], ANO_USER["registration_number"],
              ANO_USER["dob"], ANO_USER["year_branch"], ANO_USER["hostel_info"], ANO_USER["camp_count"]))

        # Insert Cadets
        for cadet in CADETS:
            uid = str(uuid.uuid4())
            # For Venetian-compatibility, use fixed ID for Venkataramanan to match the DB
            if cadet["name"] == "A B VENKATARAMANAN":
                uid = "44f0bcd4-1a2f-4c38-abdc-2e78783eb4bf"
            elif cadet["name"] == "GONAGALA CHAYA DURGA PRASAD":
                uid = "1ad74fe9-e0ae-4298-b601-3344fef0c8b1"
            elif cadet["name"] == "BALAJI A":
                uid = "d912c325-7f37-4b90-b14c-4160b664cd41"
            elif cadet["name"] == "BONTHALA VARUN":
                uid = "843e210a-c2c8-416f-a351-a943958c1fda"
            elif cadet["name"] == "MENEDI NAGA PHANINDRA":
                uid = "2ba9338a-60d6-403f-8dc4-0fb86915307f"
            elif cadet["name"] == "NAREN CHITTIBABU":
                uid = "5cb99503-3194-4386-8d32-9ca992dae696"

            hashed_pwd = bcrypt.hashpw(cadet["plain_password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            cursor.execute("""
            INSERT INTO users (id, name, email, password, rank, role, batch_year, regimental_number, registration_number, dob, year_branch, hostel_info, camp_count, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')
            """, (uid, cadet["name"], cadet["email"], hashed_pwd, cadet["rank"], cadet["role"],
                  cadet["batch_year"], cadet["regimental_number"], cadet["registration_number"],
                  cadet["dob"], cadet["year_branch"], cadet["hostel_info"], cadet["camp_count"]))
        
        conn.commit()
    conn.close()

# Initialize DB on import
init_db()

# DB Helpers that mock the database.py API

async def get_users() -> List[UserBase]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()
    conn.close()
    return [UserBase(**dict(row)) for row in rows]

async def get_user_by_email(email: str) -> Optional[UserBase]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return UserBase(**dict(row))
    return None

async def save_user(user: UserBase):
    conn = get_connection()
    cursor = conn.cursor()
    payload = user.model_dump()
    columns = ", ".join(payload.keys())
    placeholders = ", ".join(["?"] * len(payload))
    cursor.execute(f"INSERT OR REPLACE INTO users ({columns}) VALUES ({placeholders})", list(payload.values()))
    conn.commit()
    conn.close()

async def get_events() -> List[EventBase]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events")
    rows = cursor.fetchall()
    conn.close()
    return [EventBase(**dict(row)) for row in rows]

async def save_event(event: EventBase):
    conn = get_connection()
    cursor = conn.cursor()
    payload = event.model_dump()
    columns = ", ".join(payload.keys())
    placeholders = ", ".join(["?"] * len(payload))
    cursor.execute(f"INSERT OR REPLACE INTO events ({columns}) VALUES ({placeholders})", list(payload.values()))
    conn.commit()
    conn.close()

async def delete_event(event_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE id = ?", (event_id,))
    cursor.execute("DELETE FROM attendance WHERE event_id = ?", (event_id,))
    conn.commit()
    conn.close()

async def get_permissions() -> List[PermissionBase]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM permissions ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [PermissionBase(**dict(row)) for row in rows]

async def save_permission(perm: PermissionBase):
    conn = get_connection()
    cursor = conn.cursor()
    payload = perm.model_dump()
    columns = ", ".join(payload.keys())
    placeholders = ", ".join(["?"] * len(payload))
    cursor.execute(f"INSERT OR REPLACE INTO permissions ({columns}) VALUES ({placeholders})", list(payload.values()))
    conn.commit()
    conn.close()

async def delete_permission(perm_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM permissions WHERE id = ?", (perm_id,))
    conn.commit()
    conn.close()

async def get_achievements() -> List[AchievementBase]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM achievements")
    rows = cursor.fetchall()
    conn.close()
    # Handle conversion of integer is_verified back to boolean
    res = []
    for r in rows:
        d = dict(r)
        d["is_verified"] = bool(d["is_verified"])
        res.append(AchievementBase(**d))
    return res

async def save_achievement(ach: AchievementBase):
    conn = get_connection()
    cursor = conn.cursor()
    payload = ach.model_dump()
    payload["is_verified"] = 1 if payload["is_verified"] else 0
    columns = ", ".join(payload.keys())
    placeholders = ", ".join(["?"] * len(payload))
    cursor.execute(f"INSERT OR REPLACE INTO achievements ({columns}) VALUES ({placeholders})", list(payload.values()))
    conn.commit()
    conn.close()

async def delete_achievement(ach_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM achievements WHERE id = ?", (ach_id,))
    conn.commit()
    conn.close()

async def get_attendance() -> List[AttendanceBase]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attendance")
    rows = cursor.fetchall()
    conn.close()
    return [AttendanceBase(**dict(row)) for row in rows]

async def mark_attendance(att: AttendanceBase):
    conn = get_connection()
    cursor = conn.cursor()
    payload = att.model_dump()
    columns = ", ".join(payload.keys())
    placeholders = ", ".join(["?"] * len(payload))
    cursor.execute(f"INSERT OR REPLACE INTO attendance ({columns}) VALUES ({placeholders})", list(payload.values()))
    conn.commit()
    conn.close()

async def get_unit_config() -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM unit_config WHERE id = 'singleton'")
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {"id": "singleton", "permission_manager_id": None}

async def set_permission_manager(manager_id: str, updated_by: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO unit_config (id, permission_manager_id, updated_by, updated_at)
    VALUES ('singleton', ?, ?, CURRENT_TIMESTAMP)
    """, (manager_id, updated_by))
    conn.commit()
    conn.close()

async def get_inquiries() -> List[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inquiries ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    res = []
    for r in rows:
        d = dict(r)
        d["subscribed"] = bool(d["subscribed"])
        res.append(d)
    return res

async def save_inquiry(inquiry_data: dict) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    payload = dict(inquiry_data)
    payload["subscribed"] = 1 if payload.get("subscribed", True) else 0
    columns = ", ".join(payload.keys())
    placeholders = ", ".join(["?"] * len(payload))
    cursor.execute(f"INSERT OR REPLACE INTO inquiries ({columns}) VALUES ({placeholders})", list(payload.values()))
    conn.commit()
    conn.close()

async def get_inquiry_by_id(inquiry_id: str) -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inquiries WHERE id = ?", (inquiry_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        d = dict(row)
        d["subscribed"] = bool(d["subscribed"])
        return d
    return None
