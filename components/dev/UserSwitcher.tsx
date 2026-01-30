"use client";

import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export function UserSwitcher() {
    const { settings, currentUser, login } = useApp();

    if (!settings.users || settings.users.length === 0) return null;

    return (
        <Card className="fixed bottom-4 right-4 w-[300px] shadow-2xl border-indigo-200 z-50 bg-white/95 backdrop-blur">
            <CardHeader className="py-3 px-4 bg-indigo-50 border-b border-indigo-100 rounded-t-lg">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    Dev: Switch User
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <div className="space-y-2">
                    {settings.users.map(user => (
                        <div
                            key={user.id}
                            onClick={() => login(user.id)}
                            className={`
                                flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors
                                ${currentUser?.id === user.id ? 'bg-indigo-100 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}
                            `}
                        >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white
                                ${user.role === 'manager' ? 'bg-purple-600' : user.role === 'admin' ? 'bg-red-600' : 'bg-blue-600'}
                            `}>
                                {user.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                                <p className="text-xs text-slate-500 capitalize">{user.role} - {user.id}</p>
                            </div>
                            {currentUser?.id === user.id && (
                                <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
