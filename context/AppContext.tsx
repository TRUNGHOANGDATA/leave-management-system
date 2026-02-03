"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    auth_id?: string;
    name: string;
    email: string;
    role: UserRole;
    department: string;
    managerId?: string | null; // ID of the manager who approves requests
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
    createdAt?: string; // For sorting
}



interface AppSettings {
    workSchedule: WorkScheduleType;
    customHolidays: CustomHoliday[];
    leaveRequests: LeaveRequest[];
    users: User[];

}

interface AppContextType {
    settings: AppSettings;
    currentUser: User | null;
    isLoading: boolean;

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
    setData: (data: { user?: User | null, users?: User[], leaveRequests?: LeaveRequest[] }) => void; // Allow manual hydration
}

const defaultSettings: AppSettings = {
    workSchedule: "mon-fri",
    customHolidays: [],
    leaveRequests: [],
    users: [], // Initial empty, will load from DB

};

const AppContext = createContext<AppContextType>({
    settings: defaultSettings,
    currentUser: null,
    isLoading: true,

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
    importHolidays: async () => { },
    setData: () => { }
});

export function AppProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
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

        // Debug for Trần Hoàng Nam
        if (user.name?.includes("Nam")) {
            console.log(`Calculating for ${user.name} (${currentYear}):`);
            console.log("Entitlement:", entitlement);
            const userRequests = requests.filter(r => r.userId === user.id);
            console.log("Total Requests:", userRequests.length);
            userRequests.forEach(r => {
                console.log(`- Req: ${r.type}, Status: ${r.status}, Year: ${new Date(r.fromDate).getFullYear()}, Days: ${r.daysAnnual}`);
            });
        }

        const used = requests
            .filter(r =>
                r.userId === user.id &&
                r.status?.toLowerCase() === 'approved' &&
                r.type === 'Nghỉ phép năm' &&
                new Date(r.fromDate).getFullYear() === currentYear
            )
            .reduce((sum, r) => sum + (Number(r.daysAnnual) || 0), 0);

        if (user.name?.includes("Nam")) console.log("Used:", used);

        return Math.max(0, entitlement - used);
    };

    // Fetch data from Supabase
    const refreshData = async () => {
        try {
            // Fetch in Parallel (Performance Optimization)
            // Fetch in Parallel (Performance Optimization)
            // Use API for Users (Bypass RLS)
            const [
                usersResponse,
                requestsResponse,
                { data: holidaysData, error: holidaysError }
            ] = await Promise.all([
                fetch('/api/users/directory'),
                fetch('/api/requests/list', { cache: 'no-store' }), // Explicit no-cache
                supabase.from('public_holidays').select('*').order('date', { ascending: true })
            ]);

            const usersJson = await usersResponse.json();
            const usersData = usersJson.users;
            const usersError = usersJson.error;

            const requestsJson = await requestsResponse.json();
            const requestsData = requestsJson.requests;
            const requestsError = requestsJson.error;

            if (usersError) throw new Error(usersError);
            if (requestsError) throw requestsError;
            if (holidaysError) console.error("Error fetching holidays:", holidaysError);

            if (requestsData && requestsData.length > 0) {
                console.log("Debug Fetch Request 0:", requestsData[0]);
                console.log("Debug Fetch Request 0 CreatedAt:", requestsData[0].created_at);
            }

            const allRequests = (requestsData || []).map((r: any) => ({
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
                requestDetails: r.request_details,
                createdAt: r.createdAt || r.created_at // Use alias if available, else original
            }));
            // Map Users with Dynamic Calculation
            const mappedUsers: User[] = (usersData || []).map((u: any) => {
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
                leaveRequests: allRequests, // Replace entire array to prevent duplicates
                users: mappedUsers,
                customHolidays: (holidaysData || []).map(h => ({
                    id: h.id, // Ensure ID is mapped
                    date: h.date, // YYYY-MM-DD
                    name: h.name
                }))
            }));

        } catch (error: any) {
            if (error?.name === 'AbortError' || error?.message?.includes('abort')) {
                // Ignore abort errors
            } else {
                console.error("Error loading data from Supabase:", error);
            }
        }
    };

    // Load on mount
    const [isLoading, setIsLoading] = useState(true);

    // --- Authentication Logic ---
    useEffect(() => {
        let isMounted = true;

        // Listen for auth changes (Signed in, Signed out, Initial Session)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;

            console.log("Auth Event:", event, session?.user?.email);

            if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
                // Determine source: 'auth_id' matching or 'id' matching handled in fetchUserProfile
                await fetchUserProfile(session.user.id, session.user.email);
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setIsLoading(false);
            } else if (event === 'INITIAL_SESSION' && !session) {
                // Handle case where no session exists on load
                setCurrentUser(null);
                setIsLoading(false);
            }
        });

        // Safety fallback: if no event fires within 5 seconds
        // Increased from 1s to 5s to prevent premature "No User" assumption on slow connections
        const timeout = setTimeout(() => {
            if (isMounted && isLoading) {
                console.log("Auth timeout (5s) - assuming no user (or waiting for server sync)");
                setIsLoading(false);
            }
        }, 5000);

        // EXPLICIT CHECK: Always check session on mount in addition to listener
        // This fixes race conditions where the listener might miss the initial state
        const checkSession = async () => {
            let userToFetch = null;

            // 1. Try Client SDK first
            const { data: { user }, error } = await supabase.auth.getUser();
            if (user) {
                userToFetch = user;
            } else {
                // 2. Fallback: Try Server API (Cookies are more reliable here)
                try {
                    const res = await fetch('/api/auth/me');
                    if (res.ok) {
                        const data = await res.json();
                        if (data.user) userToFetch = data.user;
                    }
                } catch (e) {
                    console.error("Auth Check API failed:", e);
                }
            }

            if (userToFetch && isMounted) {
                console.log("Explicit user check found:", userToFetch.email);
                await fetchUserProfile(userToFetch.id, userToFetch.email);
            }
        };
        checkSession();

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    const fetchUserProfile = async (userId: string, email?: string) => {
        try {
            let userProfile = null;

            try {
                // 1. Try by auth_id (standard)
                const resAuth = await supabase
                    .from('users')
                    .select('*')
                    .eq('auth_id', userId)
                    .single();

                if (resAuth.data) {
                    userProfile = resAuth.data;
                }
                else {
                    // 2. Try by id (legacy registration)
                    const resId = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', userId)
                        .single();

                    if (resId.data) {
                        userProfile = resId.data;
                    }
                    else if (email) {
                        // 3. Try by EMAIL using Server-Side API (Bypasses RLS)
                        try {
                            console.log("Attempting to link profile via API...");
                            const linkRes = await fetch('/api/auth/link-profile', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId, email })
                            });

                            const linkData = await linkRes.json();

                            if (linkRes.ok && linkData.user) {
                                console.log("Profile linked successfully via API");
                                userProfile = linkData.user;
                            } else {
                                console.warn("API Linking failed:", linkData.error || linkData.message);

                                // Last resort: Fetch READ-ONLY data directly if possible (unlikely if RLS blocks, but try)
                                // Or use what we have from auth
                            }
                        } catch (apiError) {
                            console.error("API call failed:", apiError);
                        }
                    }
                }
            } catch (dbError) {
                console.warn("DB lookup failed, using fallback:", dbError);
            }

            if (userProfile) {
                // Ensure name is never null/empty
                const displayName = userProfile.name || (email ? email.split('@')[0] : "User");

                const userData: User = {
                    id: userProfile.id,      // public.users id
                    auth_id: userProfile.auth_id,
                    email: userProfile.email,
                    name: displayName,       // Guaranteed string
                    role: userProfile.role || 'employee',
                    department: userProfile.department || 'Chưa cập nhật',
                    avatarUrl: userProfile.avatar_url,
                    jobTitle: userProfile.job_title,
                    employeeCode: userProfile.employee_code,
                    managerId: userProfile.manager_id,  // FIX: Map manager_id
                    workLocation: userProfile.work_location,
                    startDate: userProfile.start_date,
                    phone: userProfile.phone
                };
                setCurrentUser(userData);
            } else if (email) {
                // Total Fallback (Database completely inaccessible or user missing)
                // We create a temporary session user so they aren't kicked out
                setCurrentUser({
                    id: userId,
                    email: email || "",
                    name: (email ? email.split('@')[0] : "User"),
                    role: 'employee',
                    department: 'Chưa cập nhật'
                } as User);
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch all app data when user is loaded - separate from auth critical path
    useEffect(() => {
        if (currentUser) {
            refreshData().catch(e => console.log("Background refresh ignored:", e));
        }
    }, [currentUser]);

    const login = async (userId: string) => {
        console.warn("Legacy login called. Use Supabase Auth instead.");
    };

    const logout = async () => {
        setIsLoading(true);
        // FORCE SERVER-SIDE LOGOUT
        // This ensures all cookies are cleared and cache is revalidated
        // preventing the "Login Loop" issue.
        window.location.href = "/api/auth/signout";
    };

    const setData = (data: { user?: User | null, users?: User[], leaveRequests?: LeaveRequest[] }) => {
        if (data.user) {
            console.log("Hydrating user data...");
            setCurrentUser(data.user);
        }
        if (data.users) {
            console.log(`Hydrating ${data.users.length} users...`);
            setSettings(prev => ({ ...prev, users: data.users || [] }));
        }
        if (data.leaveRequests) {
            console.log(`Hydrating ${data.leaveRequests.length} leave requests...`);
            setSettings(prev => ({ ...prev, leaveRequests: data.leaveRequests || [] }));
        }
        setIsLoading(false);
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

        // FIX: Sync currentUser state if the updated user is the logged-in user
        if (currentUser && currentUser.id === user.id) {
            setCurrentUser(prev => prev ? ({ ...prev, ...user } as User) : null);
        }

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
                phone: user.phone,
                employee_code: user.employeeCode
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
        // Optimistic Update: Add to UI immediately to avoid lag
        const tempId = `temp-${Date.now()}`;
        const tempRequest: LeaveRequest = {
            ...request,
            id: tempId,
            status: "pending", // Default status
            createdAt: new Date().toISOString() // Ensure it sorts to top
        };

        setSettings(prev => ({
            ...prev,
            leaveRequests: [tempRequest, ...prev.leaveRequests]
        }));

        try {
            // Use Secure Server API for Creation (Bypass Client RLS/Auth timing issues)
            const response = await fetch('/api/requests/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestData: request }),
                keepalive: true // Ensure request survives navigation
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                console.error("Failed to add request via API:", result.error);
                alert(`Lỗi tạo đơn: ${result.error || 'Vui lòng thử lại'}`);
                // Rollback optimistic update
                setSettings(prev => ({
                    ...prev,
                    leaveRequests: prev.leaveRequests.filter(r => r.id !== tempId)
                }));
            } else {
                refreshData();
                // Notifications are handled server-side
            }
        } catch (e) {
            console.error("Create Request Exception", e);
            alert("Lỗi kết nối. Vui lòng kiểm tra mạng.");
            // Rollback
            setSettings(prev => ({
                ...prev,
                leaveRequests: prev.leaveRequests.filter(r => r.id !== tempId)
            }));
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
            // Use API for update (Reliable Server Auth)
            const response = await fetch('/api/requests/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, status, approverName }),
                keepalive: true
            });

            console.log("Update Status API Response:", response.status);

            const result = await response.json();

            if (!response.ok || result.error) {
                console.error("Failed to update status via API:", result.error);
                // Rollback on error
                setSettings(prev => ({ ...prev, leaveRequests: previousRequests }));
                alert("Lỗi cập nhật trạng thái đơn (API). Vui lòng thử lại.");
            } else {
                await refreshData();
                // Notifications are now handled server-side in /api/requests/status
            }
        } catch (e) {
            console.error("DB Update Error", e);
        }
    };

    const cancelLeaveRequest = async (requestId: string) => {
        // Handle Optimistic (Temp) Requests locally
        if (requestId.startsWith('temp-')) {
            console.log("Cancelling temp request locally:", requestId);
            setSettings(prev => ({
                ...prev,
                leaveRequests: prev.leaveRequests.filter(req => req.id !== requestId)
            }));
            return; // Don't send to API
        }

        const previousRequests = settings.leaveRequests;
        // Optimistic update
        setSettings(prev => ({
            ...prev,
            leaveRequests: prev.leaveRequests.map(req =>
                req.id === requestId ? { ...req, status: "cancelled" } : req
            )
        }));

        try {
            // Use API for update (Consistent with other actions)
            const response = await fetch('/api/requests/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, status: 'cancelled' })
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                console.error("Failed to cancel request:", result.error);
                alert(`Lỗi huỷ đơn: ${result.error || 'Vui lòng thử lại'}`);
                // Revert
                setSettings(prev => ({ ...prev, leaveRequests: previousRequests }));
            } else {
                refreshData();
            }
        } catch (e) {
            console.error("Cancel Request Exception", e);
            alert("Lỗi kết nối. Vui lòng thử lại.");
            // Revert
            setSettings(prev => ({ ...prev, leaveRequests: previousRequests }));
        }
    };

    return (
        <AppContext.Provider value={{ settings, currentUser, isLoading, login, logout, setWorkSchedule, addHoliday, removeHoliday, setHolidays, addLeaveRequest, updateLeaveRequestStatus, cancelLeaveRequest, setUsers, addUser, updateUser, removeUser, addBulkUsers, refreshData, updateHoliday, importHolidays, setData }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
