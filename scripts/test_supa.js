const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing Supabase Connection...');
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Connection Failed:', error.message);
    } else {
        console.log('Connection Successful! ✅');
        console.log(`Found ${data} users (via head count, actually undefined for head but no error means access ok).`);
        // Try real select
        const { data: users } = await supabase.from('users').select('email').limit(3);
        console.log('Sample Users:', users);
    }
}

testConnection();
