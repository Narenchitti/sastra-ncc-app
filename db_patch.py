import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('backend/.env')
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')
supabase = create_client(url, key)

sql = """
CREATE TABLE IF NOT EXISTS unit_config (
    id TEXT PRIMARY KEY,
    permission_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE unit_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON unit_config FOR ALL USING (true) WITH CHECK (true);
"""

try:
    response = supabase.rpc('exec_sql', {'query': sql}).execute()
    print('unit_config table created successfully.', response)
except Exception as e:
    print('RPC failed. You may need to run the SQL query manually in the Supabase SQL editor.', e)
