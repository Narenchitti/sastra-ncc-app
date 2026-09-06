# SASTRA NCC Operations & Cadet Management Platform

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Language-Python%203.11+-3776AB?logo=python)](https://python.org/)

Digital management suite for the SASTRA NCC Contingent. Built with a high-performance tactical HUD aesthetic, automated AI training curriculum scheduling, document verification, leave auditing, and real-time battalion telemetry.

---

## 🎯 System Architecture & Features

- **Role-Based Access Control**: Strict multi-tenant authorization for Associate NCC Officers (ANO) and Cadets.
- **AI Curriculum & Schedule Planner**: Google Gemini 1.5 Flash agent that parses unit syllabi, college academic calendars, and automatically proposes collision-free weekend drill schedules.
- **Multimodal Document Auditing**: Automated leave and On-Duty (OD) verification reviewing uploaded medical certificates, train tickets, and sports orders against database schedules.
- **Attendance & Camp Ledger**: Fast bulk attendance logging, camp participation counters, and qualification tracking.
- **Telemetry & Tracing**: In-memory and persistent backend performance telemetry for endpoint latencies, agent reasoning, and database queries.
- **Zero-State Tactical Cursor**: Custom reticle cursor optimized with zero-state direct DOM transforms to guarantee 60fps rendering without React re-render thrashing.
- **Dual-Database Resilience**: Supabase PostgreSQL primary backend with seamless automatic fallback to local SQLite for offline/air-gapped development.

---

## 📁 Repository Structure

```text
sastra-ncc-app/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routes (auth, attendance, events, permissions, telemetry)
│   │   ├── core/           # Configuration, security, JWT, and syllabus.json
│   │   ├── models/         # Pydantic schemas and database models
│   │   └── services/       # AI Auditor, Scheduler Agent, Query Agent, Supabase client
│   ├── scripts/            # Database wipe, seed, and nominal roll ingestion scripts
│   ├── .env.example        # Backend environment template
│   ├── openapi.yaml        # API specifications
│   ├── requirements.txt    # Python dependencies
│   ├── run_all_tests.py    # Automated backend verification test suite
│   └── schema.sql          # Relational Postgres schema with RLS policies
├── frontend/
│   ├── app/                # Next.js App Router (dashboard, login, signup)
│   ├── components/         # Reticle cursor, HUD widgets, attendance modals
│   ├── lib/                # API clients and TypeScript types
│   ├── public/             # Static logos and Contingent drill assets
│   ├── .env.example        # Frontend environment template
│   ├── package.json        # Node.js dependencies
│   └── tailwind.config.ts  # Tactical HUD military styling theme
├── project_roadmap.md      # System completion blueprint and milestone tracker
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+
- **Python**: v3.10+
- **Git**

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit backend/.env with your Supabase keys, JWT secret, and Gemini API key

# Run development server
uvicorn app.main:app --reload --port 8000
```
API Documentation will be available at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```
Web app will be available at: `http://localhost:3000`

---

## 🧪 Verification & Automated Testing

Run the full end-to-end backend verification test suite:
```bash
cd backend
python run_all_tests.py
```
This suite automatically verifies:
1. `verify_models.py` — Schema validation
2. `verify_auth_flow.py` — JWT authentication & password hashing
3. `verify_events_flow.py` — Parade and camp scheduling workflows
4. `verify_permissions_flow.py` — Cadet leave submission & approval
5. `verify_attendance.py` — Bulk attendance marking & camp counter tally
6. `verify_query_agent.py` — Natural language database query translation
7. `verify_scheduler_agent.py` — Dynamic monthly weekend schedule generator
8. `verify_scheduler_audit.py` — Multi-constraint syllabus and clash auditor
9. `verify_calendar_upload.py` — Academic calendar document ingestion
10. `verify_telemetry.py` — Latency & performance tracing

Verify frontend TypeScript compilation and build:
```bash
cd frontend
npm run build
```

---

## 🌿 Branching Strategy

- **`main`**: Production-ready, verified stable releases.
- **`development`**: Active integration branch where features and playbooks are merged after verification.
