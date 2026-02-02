import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const logs = [];

        // 1. Check Leave Requests Schema
        const { data: requestSample, error: reqError } = await supabase
            .from('leave_requests')
            .select('*')
            .limit(1);

        if (requestSample && requestSample.length > 0) {
            logs.push({
                step: "Schema Check",
                hasCreatedAt: 'created_at' in requestSample[0],
                keys: Object.keys(requestSample[0])
            });
        } else {
            logs.push({ step: "Schema Check", note: "No requests found or error", error: reqError });
        }

        // 2. Check Tradaexcel Profile
        const email = 'tradaexcel@gmail.com';
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (user) {
            logs.push({ step: "User Check", user: user });

            if (!user.manager_id) {
                // 3. Auto-Assign Manager
                // Find an admin or any other user
                const { data: potentialManager } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .neq('id', user.id) // Not self
                    .limit(1)
                    .maybeSingle();

                if (potentialManager) {
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({ manager_id: potentialManager.id })
                        .eq('id', user.id);

                    logs.push({
                        step: "Fix Manager",
                        message: `Assigned manager ${potentialManager.email} to ${email}`,
                        success: !updateError,
                        error: updateError
                    });
                } else {
                    logs.push({ step: "Fix Manager", error: "No other users found to be manager" });
                }
            } else {
                // Check existing manager
                const { data: manager } = await supabase.from('users').select('*').eq('id', user.manager_id).maybeSingle();
                logs.push({ step: "Manager Check", managerId: user.manager_id, managerData: manager });
            }
        } else {
            logs.push({ step: "User Check", error: "User tradaexcel NOT found in public.users", dbError: userError });

            // Debug: List all users
            const { data: allUsers } = await supabase.from('users').select('email, id');
            logs.push({ step: "All Users", count: allUsers?.length, sample: allUsers });
        }

        return NextResponse.json({ logs });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
