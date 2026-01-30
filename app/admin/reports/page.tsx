"use client"

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/context/AppContext";

export default function ReportsPage() {
    const { settings, currentUser } = useApp();

    const filteredData = useMemo(() => {
        if (!settings.users || !currentUser) return { users: [], requests: [] };

        let users = settings.users;
        let requests = settings.leaveRequests;

        // VISIBILITY LOGIC:
        // - Admin/Director: See ALL
        // - Manager: See ONLY own department
        // - Employee: (Should not access this page, but if so, only see self? Or handled by Menu)

        if (currentUser.role === 'manager') {
            // Manager: Only users in same department
            users = users.filter(u => u.department === currentUser.department);
            // Requests from those users
            requests = requests.filter(r => {
                const u = users.find(user => user.id === r.userId);
                return !!u;
            });
        }

        // Ensure data consistency: Requests must belong to visible users
        // This handles recursive logic if needed, but for now simple filter is enough

        return { users, requests };
    }, [settings.users, settings.leaveRequests, currentUser]);

    // Simple Calculations
    const totalRequests = filteredData.requests.length;
    const pendingRequests = filteredData.requests.filter(r => r.status === 'pending').length;
    const approvedRequests = filteredData.requests.filter(r => r.status === 'approved').length;
    const rejectedRequests = filteredData.requests.filter(r => r.status === 'rejected').length;

    return (
        <div className="container py-10 max-w-6xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Báo cáo tổng hợp</h1>
                    <p className="text-slate-500">
                        {currentUser?.role === 'manager'
                            ? `Dữ liệu phòng ban: ${currentUser.department}`
                            : 'Dữ liệu toàn công ty'}
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng số đơn nghỉ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRequests}</div>
                        <p className="text-xs text-muted-foreground mt-1">Đơn từ {filteredData.users.length} nhân viên</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{pendingRequests}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Đã duyệt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{approvedRequests}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Từ chối</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{rejectedRequests}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Chi tiết theo nhân viên</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredData.users.map(user => {
                            const userRequests = filteredData.requests.filter(r => r.userId === user.id);
                            const userPending = userRequests.filter(r => r.status === 'pending').length;
                            const userApproved = userRequests.filter(r => r.status === 'approved').length;

                            if (userRequests.length === 0) return null;

                            return (
                                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
                                    <div>
                                        <p className="font-medium text-slate-900">{user.name}</p>
                                        <p className="text-xs text-slate-500">{user.department}</p>
                                    </div>
                                    <div className="flex gap-4 text-sm">
                                        <div className="text-center">
                                            <span className="block font-bold text-slate-700">{userRequests.length}</span>
                                            <span className="text-xs text-slate-400">Tổng đơn</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="block font-bold text-green-600">{userApproved}</span>
                                            <span className="text-xs text-slate-400">Duyệt</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="block font-bold text-orange-600">{userPending}</span>
                                            <span className="text-xs text-slate-400">Chờ</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
