"use client";

import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { currentUser, isLoading } = useApp();
    const router = useRouter();

    // Client-side redirect removed in favor of Server Component protection
    // Client-side redirect REMOVED.
    // We trust the Server Component (layout.tsx) to protect this route.
    // If we are here, the Server has already verified the session.
    // Having a second check here causes race conditions (Login Loop) on slow connections.

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // If no user and not loading, don't render children (redirect happening)
    // Render children immediately.
    // Even if currentUser is still loading context, we allow the shell to render.
    // This prevents "Flash of Loading" looping.

    return <>{children}</>;
}
