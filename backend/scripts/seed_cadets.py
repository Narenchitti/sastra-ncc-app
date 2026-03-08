"""
Clean setup: Drop old users table, create new one, seed 16 cadets.
"""
import sys, os, uuid
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.core.supabase import supabase

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
    print("   Trying direct postgrest approach...")
    try:
        # Use the Supabase SQL editor endpoint
        from supabase._sync.client import SyncClient
        # Try using the REST API to execute SQL
        supabase.postgrest.schema("public")
        print("   Falling back to manual approach - please run SQL in Supabase dashboard")
        print(f"\n   SQL to run:\n{create_sql}")
    except:
        print("\n   ⚠ Cannot execute DDL via API with anon key.")
        print("   Please run this SQL in your Supabase SQL Editor:")
        print(create_sql)
        print("\n   After running the SQL, re-run this script to seed the data.")
        
        # Check if the table already has the right structure by trying an insert
        print("\n   Attempting to seed anyway in case table already exists...")

# ── Step 2: Seed cadets ──
print("\n" + "=" * 60)
print("STEP 2: Seeding 16 cadets")
print("=" * 60)

CADETS = [
    {"name": "A B VENKATARAMANAN", "email": "venkataramanan@sastra.ncc", "password": "127009001", "rank": "CUO", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023581", "registration_number": "127009001", "dob": "21-05-2005", "year_branch": "III Year, B.Tech. Mechanical Engineering", "hostel_info": "Vinaya Block-1, S-239", "camp_count": 0},
    {"name": "GONAGALA CHAYA DURGA PRASAD", "email": "durgaprasad@sastra.ncc", "password": "127180021", "rank": "CSM", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023586", "registration_number": "127180021", "dob": "13-11-2005", "year_branch": "III Year, B.Tech. Electronics Engineering (VLSI Design & Technology)", "hostel_info": "Vinaya Block-1, S-121", "camp_count": 0},
    {"name": "BALAJI A", "email": "balaji@sastra.ncc", "password": "128087010", "rank": "SGT", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023569", "registration_number": "128087010", "dob": "10-02-2005", "year_branch": "III Year, BA LLB (Hons)", "hostel_info": "Day Scholar", "camp_count": 0},
    {"name": "BONTHALA VARUN", "email": "varun@sastra.ncc", "password": "127003042", "rank": "SGT", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA011264", "registration_number": "127003042", "dob": "22-10-2005", "year_branch": "III Year, B.Tech. Computer Science & Engineering", "hostel_info": "Vinaya Block-1, S-111", "camp_count": 0},
    {"name": "MENEDI NAGA PHANINDRA", "email": "phanindra@sastra.ncc", "password": "127009080", "rank": "SGT", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023641", "registration_number": "127009080", "dob": "06-02-2004", "year_branch": "III Year, B.Tech. Mechanical Engineering", "hostel_info": "Vinaya Block-1, S-006", "camp_count": 0},
    {"name": "NAREN CHITTIBABU", "email": "naren@sastra.ncc", "password": "127018037", "rank": "CPL", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA011267", "registration_number": "127018037", "dob": "10-08-2005", "year_branch": "III Year, B.Tech. Computer Science & Business Systems", "hostel_info": "Vinaya Block-1, I-211", "camp_count": 0},
    {"name": "ASHWIN M S", "email": "ashwin@sastra.ncc", "password": "127015010", "rank": "CPL", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023638", "registration_number": "127015010", "dob": "03-02-2005", "year_branch": "III Year, B.Tech. Information Technology", "hostel_info": "Vinaya Block-1, I-111", "camp_count": 0},
    {"name": "HARIHARA BALASUBRAMANIAM A", "email": "harihara@sastra.ncc", "password": "127161019", "rank": "CPL", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA010907", "registration_number": "127161019", "dob": "09-10-2005", "year_branch": "III Year, B.Tech. Mechanical Engineering (Digital Manufacturing)", "hostel_info": "Vinaya Block-1, I-037", "camp_count": 0},
    {"name": "VASANTHAN S S", "email": "vasanthan@sastra.ncc", "password": "127003297", "rank": "CPL", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA011272", "registration_number": "127003297", "dob": "27-05-2006", "year_branch": "III Year, B.Tech. Computer Science & Engineering", "hostel_info": "Anasuya AH303", "camp_count": 0},
    {"name": "RAMANUJA C S", "email": "ramanuja@sastra.ncc", "password": "127001043", "rank": "CPL", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023565", "registration_number": "127001043", "dob": "27-03-2006", "year_branch": "III Year, B.Tech. Civil Engineering", "hostel_info": "Vinaya Block-1, S-107", "camp_count": 0},
    {"name": "S GIRISH RAGHAVAN", "email": "girish@sastra.ncc", "password": "127009121", "rank": "L/CPL", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA011255", "registration_number": "127009121", "dob": "25-06-2005", "year_branch": "III Year, B.Tech. Mechanical Engineering", "hostel_info": "Vinaya Block-1, I-004", "camp_count": 0},
    {"name": "VINNUBAN B", "email": "vinnuban@sastra.ncc", "password": "127014062", "rank": "L/CPL", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023636", "registration_number": "127014062", "dob": "05-06-2005", "year_branch": "III Year, B.Tech. Information Communication Technology", "hostel_info": "Vinaya Block-1, S-116", "camp_count": 0},
    {"name": "SUDDAMALLA VENKATA RAGHAVA REDDY", "email": "raghava@sastra.ncc", "password": "126160055", "rank": "L/CPL", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023575", "registration_number": "126160055", "dob": "06-05-2004", "year_branch": "IV Year, B.Tech. Electronics & Communication Engineering (CPS)", "hostel_info": "Vinaya Block-2, I-261", "camp_count": 0},
    {"name": "THARUN PRASAD M", "email": "tharun@sastra.ncc", "password": "127009158", "rank": "CDT", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023640", "registration_number": "127009158", "dob": "30-04-2005", "year_branch": "III Year, B.Tech. Mechanical Engineering", "hostel_info": "Vinaya Block-1, I-007", "camp_count": 0},
    {"name": "GURUH KARTHIC G", "email": "guruh@sastra.ncc", "password": "127015033", "rank": "CDT", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA011259", "registration_number": "127015033", "dob": "31-05-2005", "year_branch": "III Year, B.Tech. Information Technology", "hostel_info": "Vinaya Block-1, I-114", "camp_count": 0},
    {"name": "SHREERAAM J", "email": "shreeraam@sastra.ncc", "password": "126003247", "rank": "CDT", "role": "cadet", "batch_year": 5, "regimental_number": "TN2023SDA023630", "registration_number": "126003247", "dob": "30-05-2005", "year_branch": "IV Year, B.Tech. Computer Science & Engineering", "hostel_info": "Day Scholar", "camp_count": 0},
]

# Add UUIDs
for c in CADETS:
    c["id"] = str(uuid.uuid4())

success = 0
fail = 0
for i, cadet in enumerate(CADETS, 1):
    try:
        supabase.table("users").insert(cadet).execute()
        print(f"  ✓ {i:2d}. {cadet['rank']:<5s} {cadet['name']}")
        success += 1
    except Exception as e:
        print(f"  ✗ {i:2d}. {cadet['name']} — {e}")
        fail += 1

print(f"\nResult: {success} inserted, {fail} failed")

if success == 16:
    # Print credentials
    print("\n" + "=" * 110)
    print("CREDENTIALS TABLE — Save this!")
    print("=" * 110)
    print(f"{'#':>2s}  {'Rank':<5s}  {'Name':<35s}  {'Username (Email)':<28s}  {'Password'}")
    print("-" * 110)
    for i, c in enumerate(CADETS, 1):
        print(f"{i:2d}  {c['rank']:<5s}  {c['name']:<35s}  {c['email']:<28s}  {c['password']}")
    print("-" * 110)
    print("Login with: Email + Password (password = registration number)")
