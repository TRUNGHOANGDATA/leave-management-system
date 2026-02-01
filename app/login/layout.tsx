import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function LoginLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    try {
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (user) {
            redirect('/dashboard')
        }
    } catch (error) {
        // Safe fail: Just stay on login
    }

    return <>{children}</>
}
