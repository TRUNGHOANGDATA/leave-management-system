import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function POST(request: NextRequest) {
    try {
        const { access_token, new_password } = await request.json();

        if (!access_token || !new_password) {
            return NextResponse.json(
                { error: 'Missing access_token or new_password' },
                { status: 400 }
            );
        }

        if (new_password.length < 6) {
            return NextResponse.json(
                { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
                { status: 400 }
            );
        }

        // Verify the access token and get user
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(access_token);

        if (userError || !user) {
            console.error('Token verification failed:', userError);
            return NextResponse.json(
                { error: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.' },
                { status: 401 }
            );
        }

        // Update user's password using admin API
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: new_password }
        );

        if (updateError) {
            console.error('Password update failed:', updateError);
            let errorMsg = updateError.message;
            if (errorMsg.includes('different from the old')) {
                errorMsg = 'Mật khẩu mới phải khác mật khẩu cũ.';
            }
            return NextResponse.json(
                { error: errorMsg },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công!' });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Đã có lỗi xảy ra' },
            { status: 500 }
        );
    }
}
