
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ycdyqlaxtjhbywsvwjpf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHlxbGF4dGpoYnl3c3Z3anBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODI5NjAsImV4cCI6MjA4NTM1ODk2MH0.N0vxHRvD54aLiuYlDZvtsGXCXWhPGFRs2SmaAQCxZmo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Fetching last 10 requests...");
    const { data, error } = await supabase
        .from('leave_requests')
        .select('id, from_date, created_at, status')
        .order('from_date', { ascending: false }) // Check raw order by from_date to match UI
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- Requests (Ordered by FromDate Desc) ---');
    data.forEach(r => {
        console.log(`ID: ${r.id} | From: ${r.from_date} | CreatedAt: ${r.created_at} | Status: ${r.status}`);
    });
}

checkData();
