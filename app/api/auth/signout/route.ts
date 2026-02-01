
import { createClient } from "@/utils/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
    const supabase = await createClient();

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        await supabase.auth.signOut();
    }

    // Attempt to manually clear cookies just in case
    // Note: 'createClient' already handles cookie deletion via the 'setAll' method when signOut is called
    // but we want to be extra sure by redirecting

    const requestUrl = new URL(req.url);
    const origin = requestUrl.origin;

    // Force revalidate to clear any cached data
    revalidatePath("/", "layout");

    return NextResponse.redirect(`${origin}/login`, {
        status: 302,
    });
}
