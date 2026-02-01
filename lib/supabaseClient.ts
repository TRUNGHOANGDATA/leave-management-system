import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase authentication keys. Please check your .env.local or Vercel Environment Variables.")
}

// Use createBrowserClient for Cookie-based Auth (Syncs with Server Components)
export const supabase = createBrowserClient(supabaseUrl || '', supabaseKey || '')
