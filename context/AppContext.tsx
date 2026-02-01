"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { calculateEntitlement } from "@/lib/leave-utils";

export type WorkScheduleType = "mon-fri" | "mon-sat" | "mon-sat-morning";

export interface CustomHoliday {
    id?: string;
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
    startDate?: string; // Date of joining
    workLocation?: string;
    jobTitle?: string;
    phone?: string;
    annualLeaveRemaining?: number; // Real-time value from DB
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
    login: (userId: string) => void;
    logout: () => Promise<void>;
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
    updateHoliday: (currentDate: string, newDate: string, newName: string) => Promise<void>;
    importHolidays: (holidays: { date: string, name: string }[]) => Promise<void>;
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
    login: () => { },
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
    refreshData: async () => { },
    updateHoliday: async () => { },
    importHolidays: async () => { }
});

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // --- Email Notification Helper ---
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://leave-management-system-self-mu.vercel.app";

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
                // Silent fail for email - don't disrupt user experience
            }
        } catch (error) {
            console.error('Failed to call Edge Function:', error);
        }
    };


    // --- Helper: Calculate Annual Leave Entitlement (Anniversary-Based) ---
    // Moved to lib/leave-utils.ts for shared use


    // Calculate Real-time Balance
    // Balance = Entitlement - Approved Leave Days (Annual Type)
    const calculateRemaining = (user: any, entitlement: number, requests: any[]) => {
        const currentYear = new Date().getFullYear();
        const used = requests
            .filter(r =>
                r.userId === user.id &&
                r.status === 'approved' &&
                r.type === 'Nghỉ phép năm' &&
                new Date(r.fromDate).getFullYear() === currentYear
            )
            .reduce((sum, r) => sum + (r.daysAnnual || 0), 0);

        return Math.max(0, entitlement - used);
    };

    // Fetch data from Supabase
    const refreshData = async () => {
        try {
            // Fetch in Parallel (Performance Optimization)
            const [
                { data: usersData, error: usersError },
                { data: requestsData, error: requestsError },
                { data: notifData, error: notifError },
                { data: holidaysData, error: holidaysError }
            ] = await Promise.all([
                supabase.from('users').select('*'),
                supabase.from('leave_requests').select('*'),
                supabase.from('notifications').select('*').order('created_at', { ascending: false }),
                supabase.from('public_holidays').select('*').order('date', { ascending: true })
            ]);

            if (usersError) throw usersError;
            if (requestsError) throw requestsError;
            if (notifError) throw notifError;
            if (holidaysError) console.error("Error fetching holidays:", holidaysError);

            const allRequests = (requestsData || []).map(r => ({
                id: r.id,
                type: r.type,
                fromDate: r.from_date,
                toDate: r.to_date,
                duration: r.duration,
                daysAnnual: r.days_annual,
                daysUnpaid: r.days_unpaid,
                daysExempt: r.days_exempt,
                status: r.status,
                reason: r.reason,
                userId: r.user_id,
                approvedBy: r.approved_by,
                exemptionNote: r.exemption_note,
                requestDetails: r.request_details
            }));

            // Map Users with Dynamic Calculation
            const mappedUsers: User[] = (usersData || []).map(u => {
                const entitlement = calculateEntitlement(u);
                const remaining = calculateRemaining(u, entitlement, allRequests);

                return {
                    id: u.id,
                    name: u.name || u.email, // Fallback
                    email: u.email,
                    role: u.role as UserRole,
                    department: u.department || "",
                    managerId: u.manager_id,
                    avatarUrl: u.avatar_url,
                    employeeCode: u.employee_code || undefined,
                    workLocation: u.work_location || undefined,
                    startDate: u.start_date, // Map from DB
                    jobTitle: u.job_title || undefined,
                    phone: u.phone,
                    annualLeaveRemaining: remaining // DYNAMIC VALUE OVERRIDE
                };
            });

            // Re-calculate duration only if missing from DB (legacy data) - This logic is now handled in allRequests mapping
            // const requestsWithDuration = mappedRequests.map(r => {
            //     if (r.duration > 0) return r;
            //     const start = new Date(r.fromDate);
            //     const end = new Date(r.toDate);
            //     const diffTime = Math.abs(end.getTime() - start.getTime());
            //     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            //     // Note: this is rough, doesn't account for weekends/holidays exact logic but good enough for display if DB empty
            //     return { ...r, duration: diffDays };
            // });

            setSettings(prev => ({
                ...prev,
                users: mappedUsers,
                leaveRequests: allRequests, // Replace with loaded requests,
                notifications: (notifData || []).map(n => ({
                    id: n.id,
                    recipientId: n.recipient_id,
                    actorName: n.actor_name,
                    message: n.message,
                    actionUrl: n.action_url,
                    isRead: n.is_read,
                    createdAt: n.created_at
                })),
                customHolidays: (holidaysData || []).map(h => ({
                    id: h.id, // Ensure ID is mapped
                    date: h.date, // YYYY-MM-DD
                    name: h.name
                }))
            }));

        } catch (error) {
            console.error("Error loading data from Supabase:", error);
        }
    };

    // Load on mount
    const [isLoading, setIsLoading] = useState(true);

    // --- Authentication Logic ---
    useEffect(() => {
        const checkUser = async () => {
            try {
                // 1. Check active session
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    await fetchUserProfile(session.user.id, session.user.email);
                } else {
                    setCurrentUser(null);
                }
            } catch (error) {
                console.error("Auth check failed:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkUser();

        // 2. Listen for auth changes (Signed in, Signed out)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                await fetchUserProfile(session.user.id, session.user.email);
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchUserProfile = async (userId: string, email?: string) => {
        try {
            // First try to find user by auth_id (for Excel-imported users who registered)
            let { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', userId)
                .single();

            // Fallback: try by id (for users created directly via registration)
            if (!data) {
                const fallback = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();
                data = fallback.data;
            }

            if (data) {
                setCurrentUser(data as User);
            } else if (email) {
                // Fallback if public.users row missing entirely
                setCurrentUser({
                    id: userId,
                    email: email,
                    name: email.split('@')[0],
                    role: 'employee',
                    department: 'Chưa cập nhật'
                } as User);
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
        }
    };

    const login = async (userId: string) => {
        console.warn("Legacy login called. Use Supabase Auth instead.");
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
        window.location.href = "/login";
    };

    const setWorkSchedule = (schedule: WorkScheduleType) => {
        // Still local for now (Global config not in DB yet)
        setSettings((prev) => ({ ...prev, workSchedule: schedule }));
    };

    const addHoliday = async (date: Date, name: string) => {
        const dateStr = date.toISOString().split('T')[0];

        // Optimistic update
        setSettings(prev => {
            if (prev.customHolidays.some(h => h.date === dateStr)) return prev;
            return {
                ...prev,
                customHolidays: [...prev.customHolidays, { date: dateStr, name }]
            };
        });

        try {
            const { error, data } = await supabase.from('public_holidays').insert({
                date: dateStr,
                name: name
            }).select();

            if (error) {
                console.error("Error adding holiday:", error);
                // Rollback or alert could be added here
            } else if (data) {
                // Update with real ID
                setSettings(prev => ({
                    ...prev,
                    customHolidays: prev.customHolidays.map(h =>
                        h.date === dateStr ? { ...h, id: data[0].id } : h
                    )
                }));
            }
        } catch (e) {
            console.error("Exception adding holiday:", e);
        }
    };

    const removeHoliday = async (dateStr: string) => {
        setSettings(prev => ({
            ...prev,
            customHolidays: prev.customHolidays.filter(h => h.date !== dateStr)
        }));

        try {
            const { error } = await supabase.from('public_holidays').delete().eq('date', dateStr);
            if (error) console.error("Error removing holiday:", error);
        } catch (e) {
            console.error("Exception removing holiday:", e);
        }
    };

    const updateHoliday = async (currentDate: string, newDate: string, newName: string) => {
        setSettings(prev => ({
            ...prev,
            customHolidays: prev.customHolidays.map(h =>
                h.date === currentDate ? { ...h, date: newDate, name: newName } : h
            )
        }));

        try {
            const { error } = await supabase.from('public_holidays')
                .update({ date: newDate, name: newName })
                .eq('date', currentDate);

            if (error) {
                console.error("Error updating holiday:", error);
                refreshData(); // Revert on error
            }
        } catch (e) {
            console.error("Exception updating holiday:", e);
        }
    };

    const importHolidays = async (holidays: { date: string, name: string }[]) => {
        if (holidays.length === 0) return;

        // Optimistic update (might be tricky with upsert, but let's try to merge)
        setSettings(prev => {
            const newMap = new Map(prev.customHolidays.map(h => [h.date, h]));
            holidays.forEach(h => {
                newMap.set(h.date, { ...h, id: newMap.get(h.date)?.id }); // Keep ID if exists
            });
            return {
                ...prev,
                customHolidays: Array.from(newMap.values()).sort((a, b) => a.date.localeCompare(b.date))
            };
        });

        try {
            // Upsert to Supabase
            // onConflict matches the unique constraint on 'date' column
            const { error } = await supabase.from('public_holidays').upsert(
                holidays,
                { onConflict: 'date' }
            );

            if (error) {
                refreshData(); // Revert
            } else {
                refreshData(); // Sync IDs
            }
        } catch (e) {
            console.error("Exception importing holidays:", e);
        }
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
                start_date: user.startDate, // Add start_date
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
                start_date: user.startDate, // Add start_date
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
                start_date: user.startDate, // Add start_date
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


                if (manager?.email) {
                    // Use configured SITE_URL for reliable production links
                    const approveUrl = `${SITE_URL}/dashboard`;

                    // 1. Insert In-App Notification (with error logging)
                    supabase.from('notifications').insert({
                        recipient_id: manager.id,
                        actor_name: requester?.name || "Nhân viên",
                        message: `đã gửi đơn xin nghỉ: ${request.type}`,
                        action_url: `/dashboard`, // Manager dashboard
                        is_read: false
                    }).then(({ error }) => {
                        if (error) {
                            console.error('[Notification Insert Error]', error);
                        } else {

                        }
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
                                    status: status, // 'approved' / 'rejected' for logic check
                                    statusColor: status === 'approved' ? '#16a34a' : '#dc2626', // Green/Red
                                    approverName: approverName || currentUser?.name || 'Quản lý',
                                    fromDate: request?.fromDate,
                                    toDate: request?.toDate
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
        <AppContext.Provider value={{ settings, currentUser, notificationCount, markNotificationRead, login, logout, setWorkSchedule, addHoliday, removeHoliday, setHolidays, addLeaveRequest, updateLeaveRequestStatus, cancelLeaveRequest, setUsers, addUser, updateUser, removeUser, addBulkUsers, refreshData, updateHoliday, importHolidays }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
