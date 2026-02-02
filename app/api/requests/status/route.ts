import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { requestId, status, approverName } = await request.json()
        const supabase = await createClient()

        // Initialize Admin Client for Notification Logic
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

        // 2. Perform Update (RLS will be applied based on Server User)
        // If RLS is still an issue, we might need Service Role, but first try standard Server Client
        // Standard Server Client > Client SDK because it reliably has the cookie.
        const { data, error } = await supabase
            .from('leave_requests')
            .update({
                status: status,
                approved_by_name: approverName,
                approved_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .select()

        if (error) {
            console.error('Update Request Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // 3. Send Notifications (Server-Side Reliability)
        if (data && data.length > 0) {
            const updatedRequest = data[0];
            const requesterId = updatedRequest.user_id;

            // Fetch Requester Email
            // Fetch Requester Email
            const { data: requester, error: userError } = await adminSupabase // Use Admin Client for full user access
                .from('users')
                .select('email, name')
                .eq('id', requesterId)
                .maybeSingle(); // Safe lookup

            // Fallback: If not found by ID, try finding by Auth ID (unlikely but possible if data is weird)
            let targetRequester = requester;
            if (!targetRequester) {
                const { data: authRequester } = await adminSupabase
                    .from('users')
                    .select('email, name')
                    .eq('auth_id', requesterId) // Try treating ID as Auth ID
                    .maybeSingle();
                targetRequester = authRequester;
            }

            if (targetRequester && targetRequester.email) {
                const statusMessage = status === 'approved' ? 'DUYỆT' : status === 'rejected' ? 'TỪ CHỐI' : 'HUỶ DUYỆT';
                const statusColor = status === 'approved' ? '#16a34a' : '#dc2626';

                // A. Insert In-App Notification
                await adminSupabase.from('notifications').insert({
                    recipient_id: requesterId,
                    actor_name: approverName || "Quản lý",
                    message: `đã ${statusMessage} đơn xin nghỉ của bạn`,
                    action_url: `/dashboard/request`,
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
                        type: 'request_decision',
                        to: targetRequester.email,
                        data: {
                            requesterName: targetRequester.name || 'Nhân viên',
                            status: status,
                            statusColor: statusColor,
                            approverName: approverName || "Quản lý",
                            fromDate: updatedRequest.from_date,
                            toDate: updatedRequest.to_date
                        }
                    })
                }).catch(e => console.error("Email API Error:", e));
            }
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error('Update Request Exception:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
