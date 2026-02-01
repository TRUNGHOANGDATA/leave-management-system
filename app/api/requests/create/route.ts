import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { requestData } = await request.json()
        const supabase = await createClient()

        // Initialize Admin Client for Notifications
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // 1. Verify User Session
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Resolve Public User ID (Fix FK Violation)
        // The foreign key in leave_requests references public.users.id, not auth.users.id
        const { data: publicUser, error: userLookupError } = await adminSupabase
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .single();

        if (userLookupError || !publicUser) {
            console.error("Public User Not Found for Auth ID:", user.id);
            return NextResponse.json({ error: 'User profile not found. Please contact admin.' }, { status: 404 });
        }

        // 3. Insert Request (RLS Safe via Server Client)
        const { data, error } = await supabase.from('leave_requests').insert({
            user_id: publicUser.id, // Use correct foreign key ID

            type: requestData.type,
            from_date: requestData.fromDate,
            to_date: requestData.toDate,
            duration: requestData.duration,
            days_annual: requestData.daysAnnual,
            days_unpaid: requestData.daysUnpaid,
            days_exempt: requestData.daysExempt,
            reason: requestData.reason,
            status: 'pending',
            request_details: requestData.requestDetails,
            exemption_note: requestData.exemptionNote
        }).select();

        if (error) {
            console.error("Insert Request Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Send Notifications (Server-Side Reliability)
        if (data && data.length > 0) {
            const newRequest = data[0];
            const newRequestId = newRequest.id;

            // Fetch Requester & Manager Info
            // We need full user list or specific manager lookup. 
            // Better to fetch requester's profile to get manager_id, then fetch manager.

            // Fetch Requester & Manager Info
            const { data: requesterProfile } = await adminSupabase
                .from('users')
                .select('*')
                .eq('id', publicUser.id) // Use Public ID, not Auth ID
                .single();

            if (requesterProfile && requesterProfile.manager_id) {
                const { data: managerProfile } = await adminSupabase
                    .from('users')
                    .select('id, email, name')
                    .eq('id', requesterProfile.manager_id)
                    .single();

                if (managerProfile && managerProfile.email) {
                    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
                    const baseUrl = SITE_URL.endsWith('/') ? SITE_URL.slice(0, -1) : SITE_URL;
                    const approveUrl = `${baseUrl}/approve/${newRequestId}`;

                    // A. Insert In-App Notification
                    await adminSupabase.from('notifications').insert({
                        recipient_id: managerProfile.id,
                        actor_name: requesterProfile.name || "Nhân viên",
                        message: `đã gửi đơn xin nghỉ: ${requestData.type}`,
                        action_url: `/approve/${newRequestId}`,
                        is_read: false
                    });

                    // B. Send Email via Edge Function
                    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify({
                            type: 'new_request',
                            to: managerProfile.email,
                            data: {
                                requesterName: requesterProfile.name || 'Nhân viên',
                                leaveType: requestData.type,
                                fromDate: requestData.fromDate,
                                toDate: requestData.toDate,
                                reason: requestData.reason || 'Không có',
                                approveUrl: approveUrl,
                            }
                        })
                    }).catch(e => console.error("Email API Error:", e));
                }
            }
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error('Create Request Exception:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
