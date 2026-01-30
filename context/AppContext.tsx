"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type WorkScheduleType = "mon-fri" | "mon-sat" | "mon-sat-morning";

export interface CustomHoliday {
    date: string; // ISO format YYYY-MM-DD
    name: string;
}

export type UserRole = "employee" | "manager" | "admin" | "hr" | "director";

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department: string;
    managerId?: string; // ID of the manager who approves requests
    avatarUrl?: string;
    employeeCode?: string; // Custom Code: NV_0001
    workLocation?: string;
    jobTitle?: string;
    phone?: string;
}

export interface LeaveRequest {
    id: string;
    type: "Nghỉ phép năm" | "Nghỉ việc riêng" | "Nghỉ ốm" | "Nghỉ không lương" | "Khác";
    fromDate: string; // ISO Date string
    toDate: string;   // ISO Date string
    duration: number; // Total working days (not calendar days)
    daysAnnual: number; // Days deducted from annual leave
    daysUnpaid: number; // Unpaid leave days
    daysExempt: number; // Legal exemption days (cưới/tang etc.)
    status: "pending" | "approved" | "rejected" | "cancelled";
    reason?: string;
    userId: string;   // Link request to user
    approvedBy?: string; // Approver's name (not ID)
    exemptionNote?: string; // e.g. "Trừ 1 ngày phép, 3 ngày miễn trừ"
    requestDetails?: {
        date: string;
        session: "morning" | "afternoon" | "full";
    }[];
}

export interface Notification {
    id: string;
    recipientId: string;
    actorName: string;
    message: string;
    actionUrl?: string;
    isRead: boolean;
    createdAt: string;
}

interface AppSettings {
    workSchedule: WorkScheduleType;
    customHolidays: CustomHoliday[];
    leaveRequests: LeaveRequest[];
    users: User[];
    notifications: Notification[];
}

interface AppContextType {
    settings: AppSettings;
    currentUser: User | null;
    notificationCount: number;
    markNotificationRead: (id: string) => Promise<void>;
    login: (path?: string) => void;
    logout: () => void;
    setWorkSchedule: (schedule: WorkScheduleType) => void;
    addHoliday: (date: Date, name: string) => void;
    removeHoliday: (dateStr: string) => void;
    setHolidays: (holidays: CustomHoliday[]) => void;
    addLeaveRequest: (request: LeaveRequest) => void;
    updateLeaveRequestStatus: (requestId: string, status: "approved" | "rejected" | "cancelled", approverName?: string) => void;
    cancelLeaveRequest: (requestId: string) => void; // Employee self-cancel for PENDING only
    setUsers: (users: User[]) => void; // Legacy / Optimistic
    addUser: (user: User) => Promise<void>;
    updateUser: (user: Partial<User>) => Promise<void>;
    removeUser: (userId: string) => Promise<void>;
    addBulkUsers: (users: User[]) => Promise<void>;
    refreshData: () => Promise<void>;
}

const defaultSettings: AppSettings = {
    workSchedule: "mon-fri",
    customHolidays: [],
    leaveRequests: [],
    users: [], // Initial empty, will load from DB
    notifications: []
};

const AppContext = createContext<AppContextType>({
    settings: defaultSettings,
    currentUser: null,
    notificationCount: 0,
    markNotificationRead: async () => { },
    login: (path?: string) => { },
    logout: async () => { },
    setWorkSchedule: () => { },
    addHoliday: () => { },
    removeHoliday: () => { },
    setHolidays: () => { },
    addLeaveRequest: () => { },
    updateLeaveRequestStatus: () => { },
    cancelLeaveRequest: () => { },
    setUsers: () => { },
    addUser: async () => { },
    updateUser: async () => { },
    removeUser: async () => { },
    addBulkUsers: async () => { },
    refreshData: async () => { }
});

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // --- Email Notification Helper ---
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const callEdgeFunction = async (payload: { type: string; to: string; data: any }) => {
        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) {
                console.error('Edge Function Error:', result);
            } else {
                console.log('Email sent successfully:', result);
            }
        } catch (error) {
            console.error('Failed to call Edge Function:', error);
        }
    };

    // Fetch data from Supabase
    const refreshData = async () => {
        try {
            // Fetch Users
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*');

            if (usersError) throw usersError;

            // Fetch Requests
            const { data: requestsData, error: requestsError } = await supabase
                .from('leave_requests')
                .select('*');

            if (requestsError) throw requestsError;

            // Fetch Notifications
            const { data: notifData, error: notifError } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (notifError) throw notifError;

            // Map Users
            const mappedUsers: User[] = (usersData || []).map(u => ({
                id: u.id,
                name: u.name || u.email, // Fallback
                email: u.email,
                role: u.role as UserRole,
                department: u.department || "",
                managerId: u.manager_id,
                avatarUrl: u.avatar_url,
                employeeCode: u.employee_code || undefined,
                workLocation: u.work_location || undefined,
                jobTitle: u.job_title || undefined
            }));

            // Map Requests
            const mappedRequests: LeaveRequest[] = (requestsData || []).map(r => ({
                id: r.id,
                type: r.type as any,
                fromDate: r.from_date,
                toDate: r.to_date,
                duration: r.duration || 0, // Use stored duration from DB
                daysAnnual: r.days_annual || 0,
                daysUnpaid: r.days_unpaid || 0,
                daysExempt: r.days_exempt || 0,
                status: r.status as any,
                reason: r.reason,
                userId: r.user_id,
                approvedBy: r.approved_by_name || null,
                exemptionNote: r.exemption_note,
                requestDetails: r.request_details as any
            }));

            // Re-calculate duration only if missing from DB (legacy data)
            const requestsWithDuration = mappedRequests.map(r => {
                if (r.duration > 0) return r;
                const start = new Date(r.fromDate);
                const end = new Date(r.toDate);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                // Note: this is rough, doesn't account for weekends/holidays exact logic but good enough for display if DB empty
                return { ...r, duration: diffDays };
            });

            setSettings(prev => ({
                ...prev,
                users: mappedUsers,
                leaveRequests: requestsWithDuration,
                notifications: (notifData || []).map(n => ({
                    id: n.id,
                    recipientId: n.recipient_id,
                    actorName: n.actor_name,
                    message: n.message,
                    actionUrl: n.action_url,
                    isRead: n.is_read,
                    createdAt: n.created_at
                }))
            }));

        } catch (error) {
            console.error("Error loading data from Supabase:", error);
        }
    };

    // Load on mount
    useEffect(() => {
        refreshData().then(() => setIsLoaded(true));
    }, []);

    // --- Authentication ---
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                // Determine user info
                // Need to ensure users are loaded or fetch specific user
                // Best pattern: Fetch user profile directly or ensure users list is loaded first
                if (settings.users.length > 0) {
                    const profile = settings.users.find(u => u.id === session.user.id);
                    if (profile) setCurrentUser(profile);
                    else {
                        // Fallback: If settings.users not loaded yet or profile missing (sync lag)
                        // For now, let refreshData handle it or wait for next render
                        // Or Force fetch
                        const { data: singleUser } = await supabase.from('users').select('*').eq('id', session.user.id).single();
                        if (singleUser) {
                            const mapped: User = {
                                id: singleUser.id,
                                name: singleUser.name || singleUser.email,
                                email: singleUser.email,
                                role: singleUser.role as UserRole,
                                department: singleUser.department || "",
                                managerId: singleUser.manager_id,
                                avatarUrl: singleUser.avatar_url,
                                employeeCode: singleUser.employee_code || undefined,
                                workLocation: singleUser.work_location || undefined,
                                jobTitle: singleUser.job_title || undefined,
                                phone: singleUser.phone || undefined
                            };
                            setCurrentUser(mapped);
                        }
                    }
                }
            } else {
                setCurrentUser(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        }
    }, [settings.users]); // Dependency on users list

    // Initial load check for session? refreshData handles data, but we need auth check too
    // refreshData loads ALL users. Better optimization later: Load only current user if not Admin?
    // For now, keep loading all users as permissions logic relies on it temporarily.

    const login = (path?: string) => {
        window.location.href = "/login";
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
        window.location.href = "/login";
    }

    const setWorkSchedule = (schedule: WorkScheduleType) => {
        // Still local for now (Global config not in DB yet)
        setSettings((prev) => ({ ...prev, workSchedule: schedule }));
    };

    const addHoliday = (date: Date, name: string) => {
        // Still local for now
        const dateStr = date.toISOString().split('T')[0];
        setSettings(prev => {
            if (prev.customHolidays.some(h => h.date === dateStr)) return prev;
            return {
                ...prev,
                customHolidays: [...prev.customHolidays, { date: dateStr, name }]
            };
        });
    };

    const removeHoliday = (dateStr: string) => {
        setSettings(prev => ({
            ...prev,
            customHolidays: prev.customHolidays.filter(h => h.date !== dateStr)
        }));
    };

    const setHolidays = (holidays: CustomHoliday[]) => {
        setSettings(prev => ({ ...prev, customHolidays: holidays }));
    };

    const setUsers = async (users: User[]) => {
        // Legacy Support
        setSettings(prev => ({ ...prev, users }));
        console.warn("setUsers deprecated for persistence. Use addUser/updateUser.");
    };

    const addUser = async (user: User) => {
        // Generate Employee Code if not provided
        let newCode = user.employeeCode;
        if (!newCode) {
            const existingCodes = settings.users
                .map(u => u.employeeCode)
                .filter(c => c && c.startsWith("NV_"))
                .map(c => parseInt(c?.split("_")[1] || "0"));

            const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
            newCode = `NV_${String(maxNum + 1).padStart(4, "0")}`;
        }

        const userWithCode = { ...user, employeeCode: newCode };

        setSettings(prev => ({ ...prev, users: [...prev.users, userWithCode] }));

        try {
            const { error } = await supabase.from('users').insert({
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.department,
                manager_id: user.managerId,
                avatar_url: user.avatarUrl,
                employee_code: newCode,
                work_location: user.workLocation,
                job_title: user.jobTitle
            });
            if (error) console.error("Add User Error", error);
            else refreshData();
        } catch (e) { console.error("Add User Exception", e); }
    };

    const addBulkUsers = async (users: User[]) => {
        try {
            const dbPayload = users.map(user => ({
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.department,
                manager_id: user.managerId,
                avatar_url: user.avatarUrl,
                employee_code: user.employeeCode,
                work_location: user.workLocation,
                job_title: user.jobTitle
            }));

            const { error } = await supabase.from('users').insert(dbPayload);
            if (error) console.error("Bulk Add User Error", error);
            else await refreshData(); // Wait for refresh to complete
        } catch (e) {
            console.error("Bulk Add User Exception", e);
        }
    };

    const updateUser = async (user: Partial<User>) => {
        setSettings(prev => ({
            ...prev,
            users: prev.users.map(u => u.id === user.id ? { ...u, ...user } : u)
        }));
        try {
            const { error } = await supabase.from('users').update({
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.department,
                manager_id: user.managerId,
                avatar_url: user.avatarUrl,
                work_location: user.workLocation,
                job_title: user.jobTitle,
                phone: user.phone
                // employee_code: user.employeeCode // Usually don't update code, but can if needed
            }).eq('id', user.id);
            if (error) console.error("Update User Error", error);
            else refreshData();
        } catch (e) { console.error("Update User Exception", e); }
    };

    const removeUser = async (userId: string) => {
        setSettings(prev => ({
            ...prev,
            users: prev.users.filter(u => u.id !== userId)
        }));
        try {
            const { error } = await supabase.from('users').delete().eq('id', userId);
            if (error) console.error("Delete User Error", error);
            else refreshData();
        } catch (e) { console.error("Delete User Exception", e); }
    };

    // --- DB Operations ---

    const addLeaveRequest = async (request: LeaveRequest) => {
        // No optimistic update - wait for DB confirmation to avoid race conditions

        try {
            const { error } = await supabase.from('leave_requests').insert({
                user_id: request.userId,
                type: request.type,
                from_date: request.fromDate,
                to_date: request.toDate,
                duration: request.duration,
                days_annual: request.daysAnnual,
                days_unpaid: request.daysUnpaid,
                days_exempt: request.daysExempt,
                reason: request.reason,
                status: 'pending',
                request_details: request.requestDetails,
                exemption_note: request.exemptionNote
            });
            if (error) {
                console.error("Failed to add request:", error);
            } else {
                refreshData();

                // --- Send Email Notification to Manager ---
                const requester = settings.users.find(u => u.id === request.userId);
                const manager = settings.users.find(u => u.id === requester?.managerId);
                console.log('[Email Debug] Requester:', requester?.name, 'Manager:', manager?.name, 'Manager Email:', manager?.email);

                if (manager?.email) {
                    // Use dashboard link where manager can see and approve requests
                    const approveUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://leave-management-system-self-mu.vercel.app'}/dashboard`;

                    // 1. Insert In-App Notification (don't await)
                    supabase.from('notifications').insert({
                        recipient_id: manager.id,
                        actor_name: requester?.name || "Nhân viên",
                        message: `đã gửi đơn xin nghỉ: ${request.type}`,
                        action_url: `/dashboard`, // Manager dashboard
                        is_read: false
                    });

                    // 2. Send Email (fire-and-forget, don't block UI)
                    callEdgeFunction({
                        type: 'new_request',
                        to: manager.email,
                        data: {
                            requesterName: requester?.name || 'Nhân viên',
                            leaveType: request.type,
                            fromDate: request.fromDate,
                            toDate: request.toDate,
                            reason: request.reason || 'Không có',
                            approveUrl: approveUrl,
                        }
                    }).catch(err => console.error('[Email Error]', err));
                }
            }
        } catch (e) {
            console.error("DB Insert Error", e);
        }
    };

    const updateLeaveRequestStatus = async (requestId: string, status: "approved" | "rejected" | "cancelled", approverName?: string) => {
        console.log('[Status Update] Starting update:', { requestId, status, approverName });

        // Optimistic update for immediate UI feedback
        const previousRequests = settings.leaveRequests;
        setSettings(prev => ({
            ...prev,
            leaveRequests: prev.leaveRequests.map(req =>
                req.id === requestId
                    ? { ...req, status, approvedBy: approverName || req.approvedBy }
                    : req
            )
        }));

        try {
            const { error, data } = await supabase
                .from('leave_requests')
                .update({
                    status: status,
                    approved_by_name: approverName || null,
                    approved_at: new Date().toISOString(),
                })
                .eq('id', requestId)
                .select();

            console.log('[Status Update] DB Response:', { error, data });

            if (error) {
                console.error("Failed to update status:", error);
                // Rollback on error
                setSettings(prev => ({ ...prev, leaveRequests: previousRequests }));
                alert("Lỗi cập nhật trạng thái đơn. Vui lòng thử lại.");
            } else {
                await refreshData();

                // --- Send Email Notification to Requester ---
                if (status === 'approved' || status === 'rejected' || status === 'cancelled') {
                    const request = settings.leaveRequests.find(r => r.id === requestId);
                    const requester = settings.users.find(u => u.id === request?.userId);
                    console.log('[Email Debug] Status Update - Requester:', requester?.name, 'Email:', requester?.email);

                    if (requester?.email) {
                        try {
                            // Determine message based on status
                            const statusMessage = status === 'approved'
                                ? 'DUYỆT'
                                : status === 'rejected'
                                    ? 'TỪ CHỐI'
                                    : 'HUỶ DUYỆT';

                            // 1. Insert In-App Notification
                            await supabase.from('notifications').insert({
                                recipient_id: requester.id,
                                actor_name: approverName || currentUser?.name || "Quản lý",
                                message: `đã ${statusMessage} đơn xin nghỉ của bạn`,
                                action_url: `/dashboard/request`,
                                is_read: false
                            });

                            // 2. Send Email
                            await callEdgeFunction({
                                type: 'request_decision',
                                to: requester.email,
                                data: {
                                    requesterName: requester.name,
                                    status: status,
                                    approverName: approverName || currentUser?.name || 'Quản lý',
                                }
                            });
                        } catch (err) { console.error("Notif Error", err) }
                    }

                    refreshData();
                }
            }
        } catch (e) {
            console.error("DB Update Error", e);
        }
    };

    const cancelLeaveRequest = async (requestId: string) => {
        setSettings(prev => ({
            ...prev,
            leaveRequests: prev.leaveRequests.map(req =>
                req.id === requestId && req.status === "pending"
                    ? { ...req, status: "cancelled" as const }
                    : req
            )
        }));

        try {
            const { error } = await supabase
                .from('leave_requests')
                .update({ status: 'cancelled' })
                .eq('id', requestId);

            if (error) throw error;
            refreshData();
        } catch (e) {
            console.error("DB Cancel Error", e);
        }
    };

    const markNotificationRead = async (id: string) => {
        // Optimistic
        setSettings(prev => ({
            ...prev,
            notifications: prev.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
        }));
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        // No need to refresh immediately
    };

    const notificationCount = currentUser ? settings.notifications.filter(n => n.recipientId === currentUser.id && !n.isRead).length : 0;

    return (
        <AppContext.Provider value={{ settings, currentUser, notificationCount, markNotificationRead, login, logout, setWorkSchedule, addHoliday, removeHoliday, setHolidays, addLeaveRequest, updateLeaveRequestStatus, cancelLeaveRequest, setUsers, addUser, updateUser, removeUser, addBulkUsers, refreshData }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
