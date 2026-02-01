import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const path = request.nextUrl.pathname

    // Skip middleware ONLY for password reset pages (these don't need session checks)
    const publicPaths = ['/forgot-password', '/reset-password']
    if (publicPaths.includes(path)) {
        return response
    }

    try {
        // Create an authenticated Supabase client for the server
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        request.cookies.set({
                            name,
                            value,
                            ...options,
                        })
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        response.cookies.set({
                            name,
                            value,
                            ...options,
                        })
                    },
                    remove(name: string, options: CookieOptions) {
                        request.cookies.set({
                            name,
                            value: '',
                            ...options,
                        })
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        response.cookies.set({
                            name,
                            value: '',
                            ...options,
                        })
                    },
                },
            }
        )

        // Check auth state with error handling
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
            console.error('Auth check failed:', error.message)
            // On auth error, allow request to continue (fail open for better UX)
            return response
        }

        // 1. Auth Guard for Dashboard & Admin
        const isProtectedPath = path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/approve')

        if (!session && isProtectedPath) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // 2. Redirect authenticated users away from Login/Register
        if (session) {
            if (path === '/login' || path === '/register' || path === '/') {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }

        return response

    } catch (error: any) {
        console.error('Middleware error:', error.message)
        // On any error, allow request to continue (fail open)
        return response
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder assets
         * - api routes
         */
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
