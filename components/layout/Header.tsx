"use client"

import React, { useState } from 'react';
import { Bell, Menu, Search, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

import { useApp } from '@/context/AppContext';

export default function Header() {
    const { currentUser, settings, markNotificationRead, logout } = useApp();

    const handleLogout = async () => {
        await logout();
    };

    // Filter notifications for current user
    const notifications = currentUser
        ? settings.notifications.filter(n => n.recipientId === currentUser.id)
        : [];

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const handleMarkAllRead = () => {
        notifications.forEach(n => {
            if (!n.isRead) markNotificationRead(n.id);
        });
    };

    const handleNotificationClick = (notif: any) => {
        if (!notif.isRead) markNotificationRead(notif.id);
        // Optional: Navigate to actionUrl
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
                    <a href="/dashboard" className="transition-colors hover:text-primary text-foreground/80 font-semibold">
                        Tổng quan
                    </a>
                    <a href="/dashboard/request" className="transition-colors hover:text-primary text-foreground/60">
                        Tạo Đơn
                    </a>
                    {(currentUser?.role === 'manager' || currentUser?.role === 'director' || currentUser?.role === 'admin') && (
                        <>
                            <a href="/admin/employees" className="transition-colors hover:text-primary text-foreground/60">
                                Nhân sự
                            </a>
                            <a href="/admin/reports" className="transition-colors hover:text-primary text-foreground/60">
                                Báo cáo
                            </a>
                        </>
                    )}
                    {(currentUser?.role === 'admin' || currentUser?.role === 'director') && (
                        <a href="/dashboard/settings" className="transition-colors hover:text-primary text-foreground/60">
                            Cài đặt
                        </a>
                    )}
                </nav>

                {/* Right Actions */}
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <nav className="flex items-center space-x-2">

                        {/* Notification Bell */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 rounded-full">
                                    <Bell className="h-5 w-5 text-slate-600" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-600"></span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 shadow-xl border-slate-100" align="end">
                                <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
                                    <h4 className="font-semibold text-sm">Thông báo</h4>
                                    <span className="text-xs text-blue-600 cursor-pointer hover:underline" onClick={handleMarkAllRead}>Đánh dấu đã đọc</span>
                                </div>
                                <div className="max-h-[80vh] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-slate-500">
                                            Không có thông báo mới
                                        </div>
                                    ) : (
                                        notifications.map((item) => (
                                            <div key={item.id} className={`flex items-start gap-3 p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!item.isRead ? 'bg-blue-50/30' : ''}`} onClick={() => handleNotificationClick(item)}>
                                                <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-slate-200">
                                                    <span className="flex h-full w-full items-center justify-center font-bold text-xs text-slate-600">
                                                        {(item.actorName || '?').charAt(0)}
                                                    </span>
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-xs text-slate-800 leading-snug">
                                                        <span className="font-bold text-slate-900">{item.actorName || 'Unknown'}</span> {item.message || ''}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        {item.createdAt && !isNaN(new Date(item.createdAt).getTime())
                                                            ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })
                                                            : 'Vừa xong'}
                                                    </p>
                                                </div>
                                                {!item.isRead && <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5"></div>}
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-2 text-center bg-slate-50/30">
                                    <span className="text-xs font-medium text-slate-500 hover:text-primary cursor-pointer">Xem tất cả thông báo</span>
                                </div>
                            </PopoverContent>
                        </Popover>

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
                                    <a href="/dashboard/profile" className="w-full cursor-pointer">Hồ sơ cá nhân</a>
                                </DropdownMenuItem>
                                {(currentUser?.role === 'admin' || currentUser?.role === 'director') && (
                                    <DropdownMenuItem asChild>
                                        <a href="/dashboard/settings" className="w-full cursor-pointer">Cài đặt</a>
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
