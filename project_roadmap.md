# SASTRA NCC Application Completion Roadmap

This document outlines the detailed system blueprint and step-by-step milestones to complete the SASTRA NCC application, aligned with the `freelance-core-architecture` playbooks.

---

## 🔍 Current System State & Context
- **Target OS:** Windows (Local Development) / Linux (Vercel & Render Production)
- **Tech Stack:** Next.js (App Router, Tailwind CSS, HUD Theme) + FastAPI (Python, Supabase-py client)
- **Database Status:** Live Supabase instance wiped and re-initialized with [schema.sql](file:///c:/Users/Naren%20PC/.gemini/antigravity/scratch/sastra-ncc-app/backend/schema.sql) (Relational PostgreSQL, Row-Level Security, and Indexes active).
- **Core Assets:** Excel roll list [Batch 5.xlsx](file:///c:/Users/Naren%20PC/.gemini/antigravity/scratch/sastra-ncc-app/Batch%205.xlsx) containing 16 active third-year cadets.
- **Fix Completed:** Refactored [TargetCursor.tsx](file:///c:/Users/Naren%20PC/.gemini/antigravity/scratch/sastra-ncc-app/frontend/components/TargetCursor.tsx) to use GPU-accelerated direct DOM class/transform updates, completely eliminating React re-rendering bottlenecks and resolving movement lag.

---

## 🗺️ Execution Milestones

### Milestone 1: Supabase Seeding & Nominal Roll Ingestion
- **Objective:** Populating the wiped live Supabase database with the default ANO account and importing cadet entries deterministically.
- **Tasks:**
  1. Modify [import_excel_to_db.py](file:///c:/Users/Naren%20PC/.gemini/antigravity/scratch/sastra-ncc-app/backend/scripts/import_excel_to_db.py) to automatically seed the default ANO account (`ano@sastra.ncc` with password `12345678`) if it doesn't already exist.
  2. Run the nominal roll ingestion script to insert the 16 cadets with deterministic UUIDs and hashed passwords.
  3. Validate database connection and verify users table contents on the Supabase dashboard.
- **Verification Gates:**
  * **Computational:** Run `python backend/scripts/import_excel_to_db.py` and verify successful output log `Ingested 17 users`.
  * **Inferential:** Check that the passwords in the database are hashed via `bcrypt` and no duplicate users are created on multiple script executions.

---

### Milestone 2: Training Scheduler & Discord Webhook Alerts (Priority 1 - Part A)
- **Objective:** Enable automated Monthly weekend calendar scheduling and publish notifications to Discord.
- **Tasks:**
  1. Verify FastAPI endpoint `/events` and service `scheduler_agent.py` to ensure it parses `syllabus.json` correctly and schedules events without history overlaps.
  2. Integrate the Discord Webhook notification service in `/events` publication flow. When an event is published by the ANO or cadet heads, broadcast details (Title, Type, Date, Time, Location) to the Discord channel.
  3. Implement frontend layout calendar widgets inside [ano/page.tsx](file:///c:/Users/Naren%20PC/.gemini/antigravity/scratch/sastra-ncc-app/frontend/app/dashboard/ano/page.tsx) and [cadet/page.tsx](file:///c:/Users/Naren%20PC/.gemini/antigravity/scratch/sastra-ncc-app/frontend/app/dashboard/cadet/page.tsx).
- **Verification Gates:**
  * **Computational:** Run the existing backend test script `verify_scheduler_agent.py` and check the discord webhook log.
  * **Inferential:** Verify that regular cadets cannot trigger the event scheduling or creation endpoints (returns `403 Forbidden`).

---

### Milestone 3: Core Attendance Marking & Camp Counts (Priority 1 - Part B)
- **Objective:** Implement full attendance logging for training events and tracking of individual cadet stats.
- **Tasks:**
  1. Finalize the backend `/attendance/bulk` endpoint to accept attendance records for a specific event and insert/upsert them into the Supabase database.
  2. Connect the frontend attendance marking UI in the ANO dashboard to post bulk attendance updates.
  3. Ensure that when a cadet's attendance status is marked as 'Present' or 'Permission' for a camp, their `camp_count` in the users table increments appropriately.
- **Verification Gates:**
  * **Computational:** Submit bulk attendance for a test event from the frontend and confirm status records exist in the Supabase database.
  * **Inferential:** Verify that cadet stats (Present % and Camp Count) on the Cadet TacOps HUD update dynamically after attendance is marked.

---

### Milestone 4: Leave Requests & Multimodal Gemini AI Auditing (Priority 2)
- **Objective:** Handle cadet leave permissions processing with automated document validation and storage fallback.
- **Tasks:**
  1. Set up file upload logic in `/upload` endpoint to support public Supabase storage bucket (`evidence`) with a safe local filesystem fallback (`static/uploads`) if bucket credentials aren't active.
  2. Finalize `ai_auditor.py` using Gemini 1.5 Flash to parse uploaded leave request documents (PDFs/Images) and verify if the date ranges and reasons match the cadet's submission details.
  3. Hook up the AI audit status ('VERIFIED', 'FLAGGED', 'NO_EVIDENCE') to the Leave Approvals widget on the ANO dashboard.
- **Verification Gates:**
  * **Computational:** Upload a test PDF leave form and check if it generates a public Supabase URL or local file path.
  * **Inferential:** Validate that the AI auditor correctly flags documents with mismatched dates or irrelevant details.

---

### Milestone 5: End-to-End Production Verification & Deployment Prep
- **Objective:** Final checks of frontend builds, environment routing, and local integration before production deployment.
- **Tasks:**
  1. Compile the Next.js frontend client locally to ensure there are no compilation or hydration errors.
  2. Test the Natural Language command center query console in the ANO panel with queries like `"Show all cadets in Vinaya Block"` or `"List absent cadets"`.
  3. Double check env configurations to verify they route through secure JWT layers.
- **Verification Gates:**
  * **Computational:** Run `npm run build` inside `frontend/` and verify that all routes build cleanly.
  * **Inferential:** Run a full black-box test covering: Cadet login -> Request leave with file upload -> AI auditing -> SUO Review -> ANO Approval -> Attendance marking -> Telemetry check.

---

> [!NOTE]
> We will execute these milestones one by one using our incremental execution loops. Please review and approve this roadmap to proceed to **Milestone 1**.
