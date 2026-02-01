"use client";

import { useApp, User } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLayoutClient({
    children,
    initialUser
}: {
    children: React.ReactNode;
    initialUser: User | null;
}) {
    const { currentUser, isLoading, setData } = useApp();
    const router = useRouter();

    // HYDRATION: If server passed a user, set it immediately
    useEffect(() => {
        if (initialUser && !currentUser) {
            setData(initialUser);
        }
    }, [initialUser]);

    // Show loading ONLY if we really have no user and are waiting
    if (isLoading && !currentUser && !initialUser) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return <>{children}</>;
}
