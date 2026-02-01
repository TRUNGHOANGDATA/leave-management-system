"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Clock, FilePlus, ArrowRight, UserCheck } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { calculateEntitlement } from "@/lib/leave-utils";
import { useApp } from "@/context/AppContext";
import { FIXED_HOLIDAYS, LUNAR_HOLIDAYS_SOLAR } from "@/lib/holidays";
import { format, differenceInDays, startOfDay, getYear, addYears } from "date-fns";
import { vi } from "date-fns/locale";
import { useMemo } from "react";
import { UserSwitcher } from "@/components/dev/UserSwitcher";
import { Check, X } from "lucide-react";

export default function Dashboard() {
    const { settings, currentUser, updateLeaveRequestStatus } = useApp();
    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'Chào buổi sáng' : currentHour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

    // 0. Manager Logic: Get pending requests from subordinates
    const pendingApprovalRequests = useMemo(() => {
        if (!currentUser || !['manager', 'director', 'admin'].includes(currentUser.role)) return [];
        return settings.leaveRequests.filter(req => {
            const requester = settings.users?.find(u => u.id === req.userId);
            // Check if requester exists and reports to current user
            return requester && requester.managerId === currentUser.id && req.status === 'pending';
        });
    }, [currentUser, settings.leaveRequests, settings.users]);

    // Manager Logic: Get approved requests from subordinates (for cancellation)
    const approvedSubordinateRequests = useMemo(() => {
        if (!currentUser || !['manager', 'director', 'admin'].includes(currentUser.role)) return [];
        return settings.leaveRequests.filter(req => {
            const requester = settings.users?.find(u => u.id === req.userId);
            return requester && requester.managerId === currentUser.id && req.status === 'approved';
        }).sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
    }, [currentUser, settings.leaveRequests, settings.users]);

    // === LEAVE CALCULATION LOGIC ===
    // Legal Allowances (Vietnamese Labor Law) - These don't count against Annual Leave
    const LEGAL_ALLOWANCES: Record<string, number> = {
        "Nghỉ cưới (bản thân)": 3,
        "Nghỉ cưới (con)": 1,
        "Nghỉ tang (cha mẹ/vợ chồng/con)": 3,
        "Nghỉ tang (ông bà/anh chị em)": 1,
    };

    // Get current year from the most recent leave request (for demo compatibility)
    const currentYear = useMemo(() => {
        const latestRequest = settings.leaveRequests[0];
        return latestRequest ? new Date(latestRequest.fromDate).getFullYear() : new Date().getFullYear();
    }, [settings.leaveRequests]);

    // Calculate Annual Leave Used (Approved only, for current year)
    const { annualLeaveUsed, unpaidLeaveUsed } = useMemo(() => {
        const userRequests = settings.leaveRequests.filter(
            r => r.userId === currentUser?.id && r.status === "approved" && r.fromDate.startsWith(String(currentYear))
        );

        let annualUsed = 0;
        let unpaidUsed = 0;

        for (const req of userRequests) {
            // 1. Accumulate Unpaid
            if (req.daysUnpaid) unpaidUsed += req.daysUnpaid;
            else if (req.type === "Nghỉ không lương") unpaidUsed += req.duration;

            // 2. Accumulate Annual
            if (req.daysAnnual) annualUsed += req.daysAnnual;
            else if (req.type !== "Nghỉ không lương") {
                // Fallback for old data or un-calculated fields
                if (LEGAL_ALLOWANCES[req.type] !== undefined) {
                    const allowance = LEGAL_ALLOWANCES[req.type];
                    annualUsed += Math.max(0, req.duration - allowance);
                } else {
                    // Regular leave types that fallback to duration if daysAnnual is missing
                    annualUsed += req.duration;
                }
            }
        }

        return { annualLeaveUsed: annualUsed, unpaidLeaveUsed: unpaidUsed };
    }, [settings.leaveRequests, currentUser, currentYear]);

    // 3. Pending Requests
    const pendingRequests = useMemo(() => {
        return settings.leaveRequests.filter(r => r.userId === currentUser?.id && r.status === "pending");
    }, [settings.leaveRequests, currentUser]);

    // 4. Recent History (Top 3)
    const recentHistory = useMemo(() => {
        return [...settings.leaveRequests]
            .filter(r => r.userId === currentUser?.id)
            .sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime())
            .slice(0, 3);
    }, [settings.leaveRequests, currentUser]);

    // Use standardized Entitlement logic
    const currentEntitlement = calculateEntitlement(currentUser);

    // Calculate Remaining based on Entitlement - Used
    // We do NOT use currentUser.annualLeaveRemaining from DB here to avoid sync issues.
    // The Dashboard should reflect the instantaneous calculation.
    const leaveLeft = Math.max(0, currentEntitlement - annualLeaveUsed);

    const leaveLeftPercent = currentEntitlement > 0
        ? Math.round((leaveLeft / currentEntitlement) * 100)
        : 0;

    // Helper for status badge style reuse (or simple inline)
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved': return "bg-green-50 text-green-700 ring-green-600/20";
            case 'pending': return "bg-yellow-50 text-yellow-800 ring-yellow-600/20";
            case 'rejected': return "bg-red-50 text-red-700 ring-red-600/20";
            case 'cancelled': return "bg-slate-50 text-slate-500 ring-slate-300/50";
            default: return "bg-slate-50 text-slate-600 ring-slate-600/20";
        }
    };
    const getStatusText = (status: string) => {
        switch (status) {
            case 'approved': return "Đã duyệt";
            case 'pending': return "Chờ duyệt";
            case 'rejected': return "Từ chối";
            case 'cancelled': return "Đã huỷ";
            default: return "Khác";
        }
    };
    const getIconColor = (status: string) => {
        switch (status) {
            case 'approved': return "bg-green-100 text-green-700 group-hover:bg-green-200";
            case 'pending': return "bg-yellow-100 text-yellow-700 group-hover:bg-yellow-200";
            case 'rejected': return "bg-red-100 text-red-700 group-hover:bg-red-200";
            default: return "bg-slate-100 text-slate-700 group-hover:bg-slate-200";
        }
    };

    // Calculate upcoming holidays
    const upcomingHolidays = useMemo(() => {
        const today = startOfDay(new Date());
        const currentYear = getYear(today);
        const nextYear = currentYear + 1;
        const yearsToCheck = [currentYear, nextYear];

        let allHolidays: { date: Date; name: string; isCustom?: boolean }[] = [];

        // Track custom dates to avoid duplicates
        const customDatesMap = new Set<string>();

        // 1. Get Custom Holidays first (Priority)
        settings.customHolidays.forEach(h => {
            const date = new Date(h.date);
            // Only care if it's in the years we are checking (or just future)
            if (date >= today) {
                allHolidays.push({ date, name: h.name, isCustom: true });
                customDatesMap.add(h.date);
            }
        });

        yearsToCheck.forEach(year => {
            // 2. Fixed holidays
            FIXED_HOLIDAYS.forEach(h => {
                const date = new Date(year, h.month, h.date);
                const dateStr = format(date, "yyyy-MM-dd");

                if (!customDatesMap.has(dateStr) && date >= today) {
                    allHolidays.push({ date, name: h.name, isCustom: false });
                }
            });

            // 3. Lunar holidays
            const lunarDates = LUNAR_HOLIDAYS_SOLAR[year] || [];
            lunarDates.forEach(dateStr => {
                if (!customDatesMap.has(dateStr)) {
                    const date = new Date(dateStr);
                    if (date >= today) {
                        allHolidays.push({ date, name: "Nghỉ Lễ/Tết (Âm lịch)", isCustom: false });
                    }
                }
            });
        });

        // Sort by date ascending and take top 2
        return allHolidays
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 2);

    }, [settings.customHolidays]);

    return (
        <div className="container py-10 space-y-8">

            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{greeting}, {currentUser?.name || 'Loading...'}</h1>
                    <p className="text-slate-500 mt-1">Chúc bạn một ngày làm việc hiệu quả! Dưới đây là thông tin nghỉ phép của bạn.</p>
                </div>
                <Button size="lg" className="shadow-lg shadow-primary/20" asChild>
                    <Link href="/dashboard/request">
                        <FilePlus className="mr-2 h-5 w-5" />
                        Tạo Đơn Mới
                    </Link>
                </Button>
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Leave Balance Card - Visual Heavy */}
                <Card className="col-span-1 lg:col-span-1 border-none shadow-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden">
                    {/* Abstract Pattern */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-black/10 blur-xl"></div>

                    <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-white/90 font-medium text-sm uppercase tracking-wider">Phép năm 2026</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="flex items-baseline justify-between mb-4">
                            <span className="text-5xl font-bold">{leaveLeft}</span>
                            <span className="text-white/80">/ {currentEntitlement} ngày</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-white/80 mb-1">
                                <span>Đã dùng: {annualLeaveUsed}</span>
                                <span>Còn lại: {leaveLeftPercent}%</span>
                            </div>
                            <Progress value={leaveLeftPercent} className="h-2 bg-white/20" />
                        </div>
                    </CardContent>
                </Card>

                {/* Clean Metric Card: Unpaid Leave */}
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 uppercase tracking-wide">Nghỉ không lương</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900 mt-2">{unpaidLeaveUsed} <span className="text-lg font-normal text-slate-500">ngày</span></div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Tính từ đầu tháng 01/{currentYear}
                        </p>
                    </CardContent>
                </Card>

                {/* Clean Metric Card: Pending Requests */}
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 uppercase tracking-wide">Đang chờ duyệt</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserCheck className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900 mt-2">{pendingRequests.length} <span className="text-lg font-normal text-slate-500">đơn</span></div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Gửi cho quản lý: <span className="font-semibold text-slate-700">Trần Văn B</span>
                        </p>
                        <Button variant="link" className="px-0 text-blue-600 h-auto mt-2 text-xs" asChild>
                            <Link href="/dashboard/history?filter=pending">
                                Xem chi tiết <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Manager Section: Pending Approvals */}
            {currentUser && ['manager', 'director', 'admin'].includes(currentUser.role) && pendingApprovalRequests.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">Cần duyệt ({pendingApprovalRequests.length})</h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {pendingApprovalRequests.map(req => {
                            const requester = settings.users?.find(u => u.id === req.userId);
                            return (
                                <Card key={req.id} className="border-l-4 border-l-yellow-400 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base font-bold text-slate-900">{requester?.name}</CardTitle>
                                                <CardDescription>{requester?.department}</CardDescription>
                                            </div>
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">Pending</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Loại nghỉ:</span>
                                                <span className="font-medium text-slate-900">{req.type}</span>
                                            </div>
                                            <div className="flex justify-between items-start">
                                                <span className="text-slate-500 whitespace-nowrap">Thời gian:</span>
                                                <div className="text-right">
                                                    {req.requestDetails && req.requestDetails.length > 0 ? (
                                                        <div className="flex flex-col gap-1">
                                                            {req.requestDetails.map((detail, idx) => (
                                                                <span key={idx} className="font-medium text-slate-900">
                                                                    {detail.session === 'full' ? 'Cả ngày' : detail.session === 'morning' ? 'Sáng' : 'Chiều'} {format(new Date(detail.date), "dd/MM/yyyy")}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="font-medium text-slate-900">
                                                            {format(new Date(req.fromDate), "dd/MM/yyyy")} - {format(new Date(req.toDate), "dd/MM/yyyy")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-start">
                                                <span className="text-slate-500">Tổng cộng:</span>
                                                <div className="text-right">
                                                    <span className="font-medium text-slate-900 block">{req.duration} ngày</span>
                                                    {(req.daysAnnual > 0 || req.daysUnpaid > 0) && (req.daysAnnual !== req.duration) && (
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            {req.daysAnnual > 0 && <span>({req.daysAnnual} phép năm)</span>}
                                                            {req.daysUnpaid > 0 && <span className="block text-amber-600">({req.daysUnpaid} không lương)</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-slate-100 mt-2">
                                                <p className="text-slate-500 italic">"{req.reason}"</p>
                                            </div>
                                            <div className="flex gap-2 pt-2 mt-2">
                                                <Button
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                    size="sm"
                                                    onClick={() => updateLeaveRequestStatus(req.id, 'approved', currentUser.name)}
                                                >
                                                    <Check className="h-4 w-4 mr-1" /> Duyệt
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                                                    size="sm"
                                                    onClick={() => updateLeaveRequestStatus(req.id, 'rejected', currentUser.name)}
                                                >
                                                    <X className="h-4 w-4 mr-1" /> Từ chối
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Manager Section: Approved Requests (for cancellation if needed) */}
            {currentUser && ['manager', 'director', 'admin'].includes(currentUser.role) && approvedSubordinateRequests.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Đã duyệt ({approvedSubordinateRequests.length})</h2>
                            <p className="text-sm text-slate-500">Nếu nhân viên muốn huỷ đơn đã duyệt, bạn có thể huỷ ở đây.</p>
                        </div>
                        <Button variant="ghost" asChild className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Link href="/dashboard/history?view=manager&filter=approved">
                                Xem tất cả <ArrowRight className="h-4 w-4 ml-1" />
                            </Link>
                        </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {approvedSubordinateRequests.slice(0, 3).map(req => {
                            const requester = settings.users?.find(u => u.id === req.userId);
                            return (
                                <Card key={req.id} className="border-l-4 border-l-green-400 shadow-sm transition-all hover:shadow-md">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-sm font-bold text-slate-900 truncate max-w-[150px]" title={requester?.name}>{requester?.name}</CardTitle>
                                                <CardDescription className="text-xs">{req.type}</CardDescription>
                                            </div>
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">Đã duyệt</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="text-sm text-slate-600 mb-3">
                                            {format(new Date(req.fromDate), "dd/MM")} - {format(new Date(req.toDate), "dd/MM/yyyy")} ({req.duration} ngày)
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-xs"
                                            onClick={() => updateLeaveRequestStatus(req.id, 'cancelled', currentUser.name)}
                                        >
                                            <X className="h-3 w-3 mr-1" /> Huỷ duyệt
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent History */}
                <Card className="col-span-4 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-slate-900">Lịch sử xin nghỉ gần đây</CardTitle>
                        <CardDescription>Theo dõi trạng thái các đơn nghỉ phép của bạn.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {recentHistory.map((item) => (
                                <div key={item.id} className="flex items-start group">
                                    <div className="flex-shrink-0 mr-4">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${getIconColor(item.status)}`}>
                                            {item.type.includes("ốm") ? (
                                                <Clock className="h-5 w-5" />
                                            ) : (
                                                <CalendarDays className="h-5 w-5" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900">{item.type}</p>
                                        <p className="text-sm text-slate-500">{format(new Date(item.fromDate), "dd/MM/yyyy")}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusStyle(item.status)}`}>
                                            {getStatusText(item.status)}
                                        </span>
                                        <p className="text-xs text-slate-400 mt-1">{item.duration} ngày</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 text-sm" asChild>
                                <Link href="/dashboard/history">Xem tất cả lịch sử</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Profile / Calendar Widget */}
                <div className="col-span-3 space-y-6">
                    {/* Profile Setup Widget */}
                    <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-slate-900">Thông tin nhân viên</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 mb-4">
                                <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                                    <AvatarFallback className="bg-primary text-white text-xl font-bold">{currentUser?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-slate-900">{currentUser?.name}</h3>
                                    <p className="text-sm text-slate-500 capitalize">{currentUser?.role}</p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-slate-200/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Mã nhân viên</span>
                                    <span className="font-medium text-slate-700">{currentUser?.employeeCode || "..."}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Phòng ban</span>
                                    <span className="font-medium text-slate-700">{currentUser?.department}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Quản lý trực tiếp</span>
                                    <span className="font-medium text-slate-700">
                                        {settings.users?.find(u => u.id === currentUser?.managerId)?.name || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Holidays Mini-Widget */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-slate-900">Ngày lễ sắp tới</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {upcomingHolidays.length > 0 ? (
                                    upcomingHolidays.map((holiday, index) => {
                                        const remainingDays = differenceInDays(holiday.date, startOfDay(new Date()));
                                        return (
                                            <div key={index} className="flex items-center gap-3">
                                                <div className="h-10 w-10 text-center rounded bg-red-50 border border-red-100 flex flex-col items-center justify-center p-1">
                                                    <span className="text-[10px] text-red-500 font-bold uppercase">
                                                        Thg {format(holiday.date, "M")}
                                                    </span>
                                                    <span className="text-sm font-bold text-red-700 leading-none">
                                                        {format(holiday.date, "dd")}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800 line-clamp-1" title={holiday.name}>{holiday.name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {remainingDays === 0 ? "Hôm nay" : `Còn ${remainingDays} ngày`}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-sm text-slate-500">Không có ngày nghỉ lễ sắp tới.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* User Switcher Widget (Dev Only) - Removed as per request */}
            {/* <UserSwitcher /> */}
        </div>
    );
}
