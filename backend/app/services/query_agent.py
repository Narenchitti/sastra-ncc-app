import os
import json
import logging
import sqlite3
import httpx
from typing import Dict, Any, List
from .sqlite_db import DB_PATH

logger = logging.getLogger("app.query_agent")

def parse_gemini_json(raw_text: str) -> Any:
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        lines = raw_text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw_text = "\n".join(lines).strip()
    
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        start_idx = raw_text.find("{")
        end_idx = raw_text.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            try:
                return json.loads(raw_text[start_idx:end_idx+1])
            except json.JSONDecodeError:
                pass
        raise

SCHEMA_PROMPT = """
You are a SQL translation assistant for the SASTRA NCC Unit management database.
Given a natural language question, translate it into a valid SQLite SELECT query.

Database Schema:
1. `users` table:
   - `id` (TEXT, primary key)
   - `name` (TEXT)
   - `email` (TEXT)
   - `password` (TEXT - DO NOT SELECT THIS FIELD FOR SECURITY REASONS)
   - `rank` (TEXT: 'Cadet', 'Lance Corporal', 'Corporal', 'Sergeant', 'CSM', 'CUO', 'SUO')
   - `role` (TEXT: 'cadet' or 'ANO')
   - `batch_year` (INTEGER: 5 for III Year, 6 for IV Year, etc.)
   - `regimental_number` (TEXT)
   - `registration_number` (TEXT)
   - `dob` (TEXT)
   - `year_branch` (TEXT)
   - `hostel_info` (TEXT)
   - `camp_count` (INTEGER)
   
2. `events` table:
   - `id` (TEXT, primary key)
   - `title` (TEXT)
   - `date` (TEXT: YYYY-MM-DD)
   - `start_time` (TEXT: HH:MM)
   - `end_time` (TEXT: HH:MM)
   - `location` (TEXT)
   - `type` (TEXT: 'Parade', 'Theory', 'Camp', 'Event')

3. `permissions` table:
   - `id` (TEXT, primary key)
   - `cadet_id` (TEXT, foreign key to users.id)
   - `cadet_name` (TEXT)
   - `start_date` (TEXT: YYYY-MM-DD)
   - `end_date` (TEXT: YYYY-MM-DD)
   - `reason` (TEXT)
   - `evidence_url` (TEXT)
   - `status` (TEXT: 'PENDING_REVIEW', 'FORWARDED_TO_ANO', 'REJECTED_BY_SUO', 'APPROVED', 'DECLINED_BY_ANO', 'MEET_ANO')
   - suo_comment (TEXT)
   - ano_comment (TEXT)
   - ai_status (TEXT)
   - ai_remarks (TEXT)

4. `achievements` table:
   - `id` (TEXT, primary key)
   - `cadet_id` (TEXT, foreign key to users.id)
   - `title` (TEXT)
   - `date` (TEXT: YYYY-MM-DD)
   - `end_date` (TEXT: YYYY-MM-DD)
   - `category` (TEXT)
   - `location` (TEXT)
   - `description` (TEXT)
   - `certificate_url` (TEXT)
   - `status` (TEXT: 'DRAFT', 'PENDING', 'VERIFIED', 'REJECTED')
   - `is_verified` (BOOLEAN)
   - `ano_comment` (TEXT)

5. `attendance` table:
   - `event_id` (TEXT, foreign key to events.id)
   - `user_id` (TEXT, foreign key to users.id)
   - `status` (TEXT: 'Present', 'Absent', 'Late', 'Permission')
   - `marked_by` (TEXT)
   - `timestamp` (TEXT)

6. `unit_config` table:
   - `id` (TEXT, primary key)
   - `permission_manager_id` (TEXT)

SQLite specific instructions:
- Use standard JOINs to combine tables when needed.
- DO NOT SELECT the `password` column under any circumstances.
- Enforce lowercase table and column names in SQL syntax.
- Write ONLY a SELECT statement. Do not perform INSERT, UPDATE, DELETE, or table modifications.

Return a JSON object with a single key "sql" containing the SQLite query string.
"""

def execute_sql(sql_query: str) -> List[Dict[str, Any]]:
    """Executes a SELECT query securely on the SQLite database."""
    clean_sql = sql_query.strip().lower()
    
    # Audit for mutations
    forbidden = ["insert", "update", "delete", "drop", "alter", "create", "replace", "truncate", "grant", "revoke", "vacuum"]
    tokens = [t.strip(";,()") for t in clean_sql.split()]
    if not clean_sql.startswith("select") or any(f in tokens for f in forbidden):
        raise ValueError("Security Violation: Only read-only SELECT queries are allowed.")
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute(sql_query)
    rows = cursor.fetchall()
    
    results = []
    for row in rows:
        d = dict(row)
        # Force filter passwords
        if "password" in d:
            del d["password"]
        results.append(d)
        
    conn.close()
    return results

async def execute_natural_query(query_text: str) -> Dict[str, Any]:
    """
    Translates a natural language query into SQL, runs it,
    and returns SQL, data, and an explanation.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        logger.info("GEMINI_API_KEY not found. Performing simulated SQL parsing.")
        query_lower = query_text.lower()
        
        # Determine simulated query
        if "cadet" in query_lower and ("list" in query_lower or "show" in query_lower) and "3rd" not in query_lower and "third" not in query_lower:
            sql = "SELECT name, email, rank, regimental_number, year_branch FROM users WHERE role = 'cadet' ORDER BY name ASC"
            explanation = "🟢 Here is the complete list of active cadets in the unit, ordered alphabetically."
        elif "3rd" in query_lower or "third" in query_lower or "batch" in query_lower:
            sql = "SELECT name, email, rank, regimental_number, year_branch FROM users WHERE role = 'cadet' AND batch_year = 5 ORDER BY name ASC"
            explanation = "🟢 Here are the 3rd-year cadets (batch year 5) currently registered in the unit."
        elif "pending" in query_lower or "leave" in query_lower or "request" in query_lower:
            sql = "SELECT cadet_name, start_date, end_date, reason, status FROM permissions WHERE status LIKE '%PENDING%' ORDER BY created_at DESC"
            explanation = "🟢 Here are the active leave and permission requests currently pending review by SUO or ANO."
        elif "attendance" in query_lower or "present" in query_lower:
            sql = "SELECT u.name as cadet_name, e.title as event_title, a.status, e.date FROM attendance a JOIN users u ON a.user_id = u.id JOIN events e ON a.event_id = e.id ORDER BY e.date DESC LIMIT 15"
            explanation = "🟢 Here is a list of recent event attendance records containing cadet attendance logs."
        elif "achievement" in query_lower or "medal" in query_lower:
            sql = "SELECT u.name as cadet_name, a.title, a.category, a.status FROM achievements a JOIN users u ON a.cadet_id = u.id ORDER BY a.status ASC"
            explanation = "🟢 Here are the achievements submitted by cadets in the central registry."
        else:
            sql = "SELECT name, email, rank, role FROM users LIMIT 10"
            explanation = "🟢 Here is a sample of users registered in the database. (Set GEMINI_API_KEY in the backend for custom natural language queries)"
            
        try:
            data = execute_sql(sql)
            return {
                "sql": sql,
                "data": data,
                "explanation": explanation
            }
        except Exception as e:
            return {
                "sql": sql,
                "data": [],
                "explanation": f"⚠️ Error executing query: {str(e)}"
            }

    # Gemini 1.5 Flash live parsing
    try:
        # Step 1: Text-to-SQL
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": SCHEMA_PROMPT},
                        {"text": f"Question: {query_text}"}
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "sql": {"type": "STRING"}
                    },
                    "required": ["sql"]
                }
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        
        from .telemetry import TelemetrySpan

        async with httpx.AsyncClient(timeout=30.0) as client:
            with TelemetrySpan("ai", "Gemini Text-to-SQL Parsing"):
                res = await client.post(url, json=payload)
            if res.status_code != 200:
                raise ValueError(f"Gemini API returned status {res.status_code}: {res.text}")
            
            sql_res = res.json()
            sql_query = parse_gemini_json(sql_res["candidates"][0]["content"]["parts"][0]["text"])["sql"]
            
            # Step 2: Execute SQL
            data = execute_sql(sql_query)
            
            # Step 3: Explain results
            explain_prompt = f"""
You are the AI Adjutant, an administrative assistant for the SASTRA NCC Unit.
The administrator asked: "{query_text}"
The database returned the following rows:
{json.dumps(data[:20])}

Based on this data, write a brief, friendly, natural language summary explaining the findings (max 3 sentences). Prepend with a relevant emoji.
If no rows were returned, explain that no matching records were found.
"""
            
            explain_payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": explain_prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseSchema": {
                        "type": "OBJECT",
                        "properties": {
                            "explanation": {"type": "STRING"}
                        },
                        "required": ["explanation"]
                    }
                }
            }
            
            with TelemetrySpan("ai", "Gemini Result Explainer"):
                explain_res = await client.post(url, json=explain_payload)
            if explain_res.status_code != 200:
                explanation = f"Query run successfully. Found {len(data)} records."
            else:
                explain_data = explain_res.json()
                explanation = parse_gemini_json(explain_data["candidates"][0]["content"]["parts"][0]["text"])["explanation"]
                
            return {
                "success": True,
                "sql": sql_query,
                "data": data,
                "explanation": explanation
            }
            
    except Exception as e:
        logger.error(f"Command Center execution failed: {e}")
        return {
            "success": False,
            "sql": "-- Failed to parse",
            "data": [],
            "explanation": f"⚠️ Command Center Error: {str(e)}"
        }
