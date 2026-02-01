import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase authentication keys. Please check your .env.local or Vercel Environment Variables.")
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '')
