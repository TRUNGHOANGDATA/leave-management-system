
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const { data, error } = await supabase
        .from('leave_requests')
        .select('id, from_date, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- Last 5 Requests ---');
    data.forEach(r => {
        console.log(`ID: ${r.id}, From: ${r.from_date}, CreatedAt: ${r.created_at}, Status: ${r.status}`);
    });
}

checkData();
