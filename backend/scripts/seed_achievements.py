"""
Seeding script to insert mock achievements into Supabase.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.supabase import supabase

print("=" * 60)
print("SEEDING MOCK ACHIEVEMENTS TO SUPABASE")
print("=" * 60)

dummy_achs = [
    {
        "id": "ach-001",
        "cadet_id": "44f0bcd4-1a2f-4c38-abdc-2e78783eb4bf", # Venkataramanan
        "title": "Best Shooter - TSC Selection",
        "date": "2026-05-15",
        "end_date": None,
        "category": "Camps",
        "location": "Trichy Group HQ",
        "description": "Secured 1st place in the group-level firing competition during Thal Sainik Camp selection trails.",
        "certificate_url": "https://example.com/certificates/shooter_tsc.pdf",
        "status": "PENDING",
        "is_verified": False,
        "ano_comment": None
    },
    {
        "id": "ach-002",
        "cadet_id": "5cb99503-3194-4386-8d32-9ca992dae696", # Naren Chittibabu
        "title": "Republic Day Camp Selection",
        "date": "2026-01-10",
        "end_date": "2026-01-28",
        "category": "Camps",
        "location": "New Delhi",
        "description": "Represented the Directorate in the Prime Minister's Rally and Guard of Honour at RDC 2026.",
        "certificate_url": "https://example.com/certificates/rdc_2026.pdf",
        "status": "VERIFIED",
        "is_verified": True,
        "ano_comment": "Excellent performance representing the institution at the national level."
    },
    {
        "id": "ach-003",
        "cadet_id": "1ad74fe9-e0ae-4298-b601-3344fef0c8b1", # Durga Prasad
        "title": "B-Certificate Exam Topper",
        "date": "2026-03-20",
        "end_date": None,
        "category": "Certificates",
        "location": "SASTRA Campus",
        "description": "Scored Alpha Grade with 94% marks in the Certificate-B theoretical and practical examinations.",
        "certificate_url": None,
        "status": "PENDING",
        "is_verified": False,
        "ano_comment": None
    }
]

success = 0
fail = 0

for ach in dummy_achs:
    try:
        supabase.table("achievements").upsert(ach, on_conflict="id").execute()
        print(f"  ✓ Seeded: {ach['title']} for Cadet ID {ach['cadet_id']}")
        success += 1
    except Exception as e:
        print(f"  ✗ Failed: {ach['title']} — {e}")
        fail += 1

print(f"\nResult: {success} successfully seeded/upserted, {fail} failed.")
