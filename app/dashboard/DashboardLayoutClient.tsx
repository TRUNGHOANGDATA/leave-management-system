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
    // Client-side redirect fallback (Double check in case Server Component let through stale session)
    useEffect(() => {
        if (!isLoading && !currentUser) {
            console.warn("Client auth check failed, redirecting to login...");
            router.replace("/login");
        }
    }, [currentUser, isLoading, router]);

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // If no user and not loading, don't render children (redirect happening)
    if (!currentUser) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return <>{children}</>;
}
