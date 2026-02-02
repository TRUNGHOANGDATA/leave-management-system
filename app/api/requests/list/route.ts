
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'; // Force no caching

export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch requests (RLS will filter automatically)
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch Requests Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ requests: data });
    } catch (error) {
        console.error('List Requests Exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
