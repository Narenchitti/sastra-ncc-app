"""
Clean setup: Drop old users table, create new one, seed 16 cadets.
Passwords are hashed with bcrypt before insertion.
"""
import sys, os, uuid
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from passlib.context import CryptContext
from app.core.supabase import supabase

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Step 1: Drop old table and create new one ──
print("=" * 60)
print("STEP 1: Recreating users table")
print("=" * 60)

create_sql = """
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security but allow all for now
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON users FOR ALL USING (true) WITH CHECK (true);
"""

try:
    supabase.rpc("exec_sql", {"query": create_sql}).execute()
    print("   ✓ Table recreated via RPC")
except Exception as e:
    print(f"   ⚠ RPC method not available: {e}")
    print("   Please run this SQL in your Supabase SQL Editor:")
    print(create_sql)
    print("\n   After running the SQL, re-run this script to seed the data.")

# ── Step 2: Seed cadets ──
print("\n" + "=" * 60)
print("STEP 2: Seeding 16 cadets (passwords hashed with bcrypt)")
print("=" * 60)

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

# ── Step 3: Hash passwords and build insert payloads ──
print("\nHashing passwords with bcrypt (this may take a few seconds)...")
payloads = []
for c in CADETS:
    plain = c.pop("plain_password")          # remove plain-text before inserting
    hashed = pwd_context.hash(plain)         # bcrypt hash
    payloads.append({**c, "id": str(uuid.uuid4()), "password": hashed})

print(f"   ✓ All {len(payloads)} passwords hashed\n")

# ── Step 4: Insert into Supabase ──
success = 0
fail = 0
for i, cadet in enumerate(payloads, 1):
    try:
        supabase.table("users").insert(cadet).execute()
        print(f"  ✓ {i:2d}. {cadet['rank']:<5s} {cadet['name']}")
        success += 1
    except Exception as e:
        print(f"  ✗ {i:2d}. {cadet['name']} — {e}")
        fail += 1

print(f"\nResult: {success} inserted, {fail} failed")

if success == 16:
    print("\n" + "=" * 110)
    print("CREDENTIALS TABLE — Save this!")
    print("=" * 110)
    print(f"{'#':>2s}  {'Rank':<5s}  {'Name':<35s}  {'Email':<28s}  {'Password (plain)'}")
    print("-" * 110)
    # Re-read originals just for display (payloads have hashed passwords)
    for i, c in enumerate(CADETS, 1):
        print(f"{i:2d}  {c['rank']:<5s}  {c['name']:<35s}  {c['email']:<28s}  {c['registration_number']}")
    print("-" * 110)
    print("Login with: Email + Password (password = registration number)")
    print("NOTE: Passwords are stored as bcrypt hashes in the database.")
