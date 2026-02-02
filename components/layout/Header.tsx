"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { useApp } from '@/context/AppContext';

export default function Header() {
    const { currentUser, settings, logout } = useApp();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/95">
            <div className="container flex h-16 items-center">
                {/* Logo Area */}
                <div className="mr-8 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-white font-bold">L</span>
                    </div>
                    <span className="hidden font-bold sm:inline-block text-xl tracking-tight">
                        Leave<span className="text-primary">Manager</span>
                    </span>
                </div>

                {/* Desktop Nav */}
                <nav className="flex items-center space-x-6 text-sm font-medium">
                    <Link href="/dashboard" className="transition-colors hover:text-primary text-foreground/80 font-semibold">
                        Tổng quan
                    </Link>
                    <Link href="/dashboard/request" className="transition-colors hover:text-primary text-foreground/60">
                        Tạo Đơn
                    </Link>
                    {(currentUser?.role === 'manager' || currentUser?.role === 'director' || currentUser?.role === 'admin') && (
                        <>
                            <Link href="/admin/employees" className="transition-colors hover:text-primary text-foreground/60">
                                Nhân sự
                            </Link>
                            <Link href="/admin/reports" className="transition-colors hover:text-primary text-foreground/60">
                                Báo cáo
                            </Link>
                        </>
                    )}
                    {(currentUser?.role === 'admin' || currentUser?.role === 'director') && (
                        <Link href="/dashboard/settings" className="transition-colors hover:text-primary text-foreground/60">
                            Cài đặt
                        </Link>
                    )}
                </nav>

                {/* Right Actions */}
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <nav className="flex items-center space-x-2">

                        {/* User Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                    <Avatar className="h-9 w-9 border border-slate-200">
                                        <AvatarImage src={currentUser?.avatarUrl || "/avatars/01.png"} alt={currentUser?.name} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {currentUser?.name ? currentUser.name.charAt(0) : "NV"}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{currentUser?.name || 'Loading...'}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {currentUser?.email || 'Loading...'}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/profile" className="w-full cursor-pointer">Hồ sơ cá nhân</Link>
                                </DropdownMenuItem>
                                {(currentUser?.role === 'admin' || currentUser?.role === 'director') && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard/settings" className="w-full cursor-pointer">Cài đặt</Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 focus:bg-red-50 cursor-pointer" onClick={handleLogout}>
                                    Đăng xuất
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                    </nav>
                </div>
            </div>
        </header>
    );
}
