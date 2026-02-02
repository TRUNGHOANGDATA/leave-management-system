
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Initialize Admin Client (Service Role)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // 1. Check if user exists
        const { data: users, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, email, name')
            .eq('email', email)
            .limit(1);

        if (userError || !users || users.length === 0) {
            // Return success even if user not found (security practice)
            // But for this internal tool, maybe helpful error is okay? 
            // Let's stick to standard practice: simulate success loop
            return NextResponse.json({ success: true, message: "If email exists, OTP sent." });
        }

        const user = users[0];

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

        // 3. Store OTP in DB (password_resets table)
        // Note: You must run the SQL migration to create this table!
        const { error: insertError } = await supabaseAdmin
            .from('password_resets')
            .insert({
                email: user.email,
                token: otp,
                expires_at: expiresAt,
                used: false
            });

        if (insertError) {
            console.error("Store OTP Error:", insertError);
            return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
        }

        // 4. Send Email via Edge Function
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                type: 'password_reset',
                to: user.email,
                data: {
                    otp: otp
                }
            })
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
