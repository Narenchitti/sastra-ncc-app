import sys
import os
import asyncio

# Configure standard streams to use utf-8 if they don't support it
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Ensure backend folder is in PATH
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.services.query_agent import execute_natural_query, execute_sql

async def run_tests():
    print("--- Running Command Center (Text-to-SQL) Tests ---")
    
    # 1. Test simulated query fallbacks
    print("\n1. Testing simulated query fallbacks...")
    queries = [
        "List all active cadets",
        "Show all 3rd-year cadets",
        "Who has pending leave requests?",
        "Show recent attendance records",
        "List achievements pending verification",
        "Show users list"
    ]
    
    for q in queries:
        print(f"\nQuery: '{q}'")
        res = await execute_natural_query(q)
        print(f"SQL Generated: {res.get('sql')}")
        # Strip or replace emojis to prevent Windows console issues
        explanation = res.get('explanation', '').replace('🟢', '[OK]').replace('⚠️', '[WARN]')
        print(f"Explanation: {explanation}")
        print(f"Data count: {len(res.get('data', []))}")
        if res.get('data'):
            print(f"Sample data keys: {list(res['data'][0].keys())}")
            
    # 2. Test safety checks (SQL Mutation Block)
    print("\n2. Testing SQL mutation safety block...")
    bad_queries = [
        "DROP TABLE users",
        "DELETE FROM users WHERE role = 'ANO'",
        "UPDATE users SET role = 'ANO' WHERE id = '1'",
        "INSERT INTO users (id, name) VALUES ('999', 'Fake Cadet')"
    ]
    
    for bq in bad_queries:
        print(f"\nAttempting forbidden SQL execution: '{bq}'")
        try:
            execute_sql(bq)
            print("❌ Test Failed: Mutation query executed successfully when it should have been blocked!")
        except ValueError as e:
            print(f"Blocked successfully: {e}")
            
    # 3. Test security (password filtering)
    print("\n3. Testing password filtering security...")
    try:
        # Intentionally select password
        sql_with_password = "SELECT id, name, email, password FROM users LIMIT 1"
        res_data = execute_sql(sql_with_password)
        if len(res_data) > 0:
            if "password" in res_data[0]:
                print("❌ Test Failed: Hashed password leaked in output rows!")
            else:
                print("✅ Password successfully filtered out from returned rows.")
        else:
            print("No users found to test password filtering.")
    except Exception as e:
        print(f"Query failed or error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(run_tests())
