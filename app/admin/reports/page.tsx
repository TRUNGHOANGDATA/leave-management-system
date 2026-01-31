"use client"

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/AppContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWithinInterval, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { Download, Calendar, BarChart3, FileSpreadsheet, Users, Clock, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
    const { settings, currentUser } = useApp();
    const [activeTab, setActiveTab] = useState("overview");
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [exportFromDate, setExportFromDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [exportToDate, setExportToDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [chartFromDate, setChartFromDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [chartToDate, setChartToDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [selectedDay, setSelectedDay] = useState<{ date: Date; leaves: { name: string; department: string; fromDate: string; toDate: string }[] } | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<{ userId: string; name: string; department: string } | null>(null);

    const filteredData = useMemo(() => {
        if (!settings.users || !currentUser) return { users: [], requests: [] };

        let users = settings.users;
        let requests = settings.leaveRequests.filter(r => r.status === 'approved');

        if (currentUser.role === 'manager') {
            users = users.filter(u => u.department === currentUser.department);
            requests = requests.filter(r => {
                const u = users.find(user => user.id === r.userId);
                return !!u;
            });
        }

        return { users, requests };
    }, [settings.users, settings.leaveRequests, currentUser]);

    // Stats
    const totalRequests = settings.leaveRequests.length;
    const pendingRequests = settings.leaveRequests.filter(r => r.status === 'pending').length;
    const approvedRequests = settings.leaveRequests.filter(r => r.status === 'approved').length;
    const rejectedRequests = settings.leaveRequests.filter(r => r.status === 'rejected').length;

    // Chart filtered data
    const chartFilteredRequests = useMemo(() => {
        const from = parseISO(chartFromDate);
        const to = parseISO(chartToDate);
        return filteredData.requests.filter(r => {
            const rFrom = parseISO(r.fromDate);
            return rFrom >= from && rFrom <= to;
        });
    }, [filteredData.requests, chartFromDate, chartToDate]);

    // Monthly Trend Data
    const monthlyTrendData = useMemo(() => {
        const months: { [key: string]: number } = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = format(d, 'MM/yyyy');
            months[key] = 0;
        }
        filteredData.requests.forEach(r => {
            const key = format(parseISO(r.fromDate), 'MM/yyyy');
            if (months[key] !== undefined) months[key]++;
        });
        return Object.entries(months).map(([name, value]) => ({ name, value }));
    }, [filteredData.requests]);

    // Leave Type Distribution (filtered)
    const leaveTypeData = useMemo(() => {
        const types: { [key: string]: number } = { 'Phép năm': 0, 'Không lương': 0, 'Theo chế độ': 0 };
        chartFilteredRequests.forEach(r => {
            types['Phép năm'] += r.daysAnnual || 0;
            types['Không lương'] += r.daysUnpaid || 0;
            types['Theo chế độ'] += r.daysExempt || 0;
        });
        return Object.entries(types).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));
    }, [chartFilteredRequests]);

    // Department Comparison (filtered)
    const deptData = useMemo(() => {
        const depts: { [key: string]: number } = {};
        chartFilteredRequests.forEach(r => {
            const user = settings.users.find(u => u.id === r.userId);
            if (user) {
                depts[user.department] = (depts[user.department] || 0) + (r.duration || 1);
            }
        });
        return Object.entries(depts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [chartFilteredRequests, settings.users]);

    // Top 5 Leave Takers (filtered)
    const topLeaveTakers = useMemo(() => {
        const userDays: { [userId: string]: number } = {};
        chartFilteredRequests.forEach(r => {
            userDays[r.userId] = (userDays[r.userId] || 0) + (r.duration || 1);
        });
        return Object.entries(userDays)
            .map(([userId, days]) => {
                const user = settings.users.find(u => u.id === userId);
                return { userId, name: user?.name || 'Unknown', department: user?.department || '', days };
            })
            .sort((a, b) => b.days - a.days)
            .slice(0, 5);
    }, [chartFilteredRequests, settings.users]);

    // Get employee leaves for dialog
    const employeeLeaves = useMemo(() => {
        if (!selectedEmployee) return [];
        return chartFilteredRequests
            .filter(r => r.userId === selectedEmployee.userId)
            .map(r => ({
                fromDate: r.fromDate,
                toDate: r.toDate,
                type: r.type,
                duration: r.duration || 1
            }))
            .sort((a, b) => parseISO(b.fromDate).getTime() - parseISO(a.fromDate).getTime());
    }, [selectedEmployee, chartFilteredRequests]);

    // Approval Rate
    const approvalRateData = useMemo(() => {
        const from = parseISO(chartFromDate);
        const to = parseISO(chartToDate);
        const inRange = settings.leaveRequests.filter(r => {
            const rFrom = parseISO(r.fromDate);
            return rFrom >= from && rFrom <= to && r.status !== 'pending';
        });
        const approved = inRange.filter(r => r.status === 'approved').length;
        const rejected = inRange.filter(r => r.status === 'rejected').length;
        return [{ name: 'Đã duyệt', value: approved }, { name: 'Từ chối', value: rejected }].filter(d => d.value > 0);
    }, [settings.leaveRequests, chartFromDate, chartToDate]);

    // Weekday Analysis
    const weekdayData = useMemo(() => {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const counts = [0, 0, 0, 0, 0, 0, 0];
        chartFilteredRequests.forEach(r => {
            const start = parseISO(r.fromDate);
            const end = parseISO(r.toDate);
            eachDayOfInterval({ start, end }).forEach(d => {
                counts[d.getDay()]++;
            });
        });
        return days.map((name, i) => ({ name, value: counts[i] }));
    }, [chartFilteredRequests]);

    // Calendar Data
    const calendarDays = useMemo(() => {
        const start = startOfMonth(calendarMonth);
        const end = endOfMonth(calendarMonth);
        return eachDayOfInterval({ start, end });
    }, [calendarMonth]);

    const getLeaveForDay = (day: Date) => {
        return filteredData.requests.filter(r => {
            const from = parseISO(r.fromDate);
            const to = parseISO(r.toDate);
            return isWithinInterval(day, { start: from, end: to });
        }).map(r => {
            const user = filteredData.users.find(u => u.id === r.userId);
            return {
                name: user?.name || 'Unknown',
                department: user?.department || '',
                fromDate: r.fromDate,
                toDate: r.toDate
            };
        });
    };

    // Export Function
    const handleExport = () => {
        const from = parseISO(exportFromDate);
        const to = parseISO(exportToDate);

        const relevantRequests = filteredData.requests.filter(r => {
            const rFrom = parseISO(r.fromDate);
            const rTo = parseISO(r.toDate);
            return (rFrom >= from && rFrom <= to) || (rTo >= from && rTo <= to) || (rFrom <= from && rTo >= to);
        });

        // Sheet 1: Summary
        const summaryMap: { [userId: string]: { annual: number, unpaid: number, exempt: number, dates: string[] } } = {};
        relevantRequests.forEach(r => {
            if (!summaryMap[r.userId]) summaryMap[r.userId] = { annual: 0, unpaid: 0, exempt: 0, dates: [] };
            summaryMap[r.userId].annual += r.daysAnnual || 0;
            summaryMap[r.userId].unpaid += r.daysUnpaid || 0;
            summaryMap[r.userId].exempt += r.daysExempt || 0;
            const start = parseISO(r.fromDate);
            const end = parseISO(r.toDate);
            eachDayOfInterval({ start, end }).forEach(d => {
                if (isWithinInterval(d, { start: from, end: to })) {
                    summaryMap[r.userId].dates.push(format(d, 'dd/MM'));
                }
            });
        });

        const summaryRows = filteredData.users.map((u, idx) => {
            const s = summaryMap[u.id] || { annual: 0, unpaid: 0, exempt: 0, dates: [] };
            return {
                'STT': idx + 1,
                'Mã NV': u.employeeCode || '',
                'Họ tên': u.name,
                'Phòng ban': u.department,
                'Phép năm': s.annual,
                'Không lương': s.unpaid,
                'Theo chế độ': s.exempt,
                'Tổng ngày': s.annual + s.unpaid + s.exempt,
                'Các ngày nghỉ': [...new Set(s.dates)].join(', ')
            };
        }).filter(r => r['Tổng ngày'] > 0);

        // Sheet 2: Details
        const detailRows = relevantRequests.map(r => {
            const user = filteredData.users.find(u => u.id === r.userId);
            return {
                'Mã NV': user?.employeeCode || '',
                'Họ tên': user?.name || '',
                'Loại nghỉ': r.type,
                'Từ ngày': format(parseISO(r.fromDate), 'dd/MM/yyyy'),
                'Đến ngày': format(parseISO(r.toDate), 'dd/MM/yyyy'),
                'Số ngày': r.duration || 1,
                'Trạng thái': r.status === 'approved' ? 'Đã duyệt' : r.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt',
                'Người duyệt': r.approvedBy || '',
                'Lý do': r.reason || ''
            };
        });

        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(summaryRows);
        const ws2 = XLSX.utils.json_to_sheet(detailRows);
        XLSX.utils.book_append_sheet(wb, ws1, 'Tổng hợp');
        XLSX.utils.book_append_sheet(wb, ws2, 'Chi tiết');
        XLSX.writeFile(wb, `BaoCaoNghiPhep_${format(from, 'ddMMyyyy')}_${format(to, 'ddMMyyyy')}.xlsx`);
    };

    return (
        <div className="container py-8 max-w-7xl space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Báo cáo & Thống kê</h1>
                    <p className="text-slate-500">
                        {currentUser?.role === 'manager' ? `Dữ liệu phòng ban: ${currentUser.department}` : 'Dữ liệu toàn công ty'}
                    </p>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex space-x-1 border-b border-slate-200">
                {[
                    { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
                    { id: 'charts', label: 'Biểu đồ', icon: TrendingUp },
                    { id: 'calendar', label: 'Lịch nghỉ Team', icon: Calendar },
                    { id: 'export', label: 'Xuất báo cáo', icon: FileSpreadsheet }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng số đơn</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalRequests}</div><p className="text-xs text-muted-foreground mt-1">Từ {filteredData.users.length} nhân viên</p></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{pendingRequests}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã duyệt</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{approvedRequests}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Từ chối</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{rejectedRequests}</div></CardContent></Card>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Chi tiết theo nhân viên</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {filteredData.users.map(user => {
                                    const userRequests = settings.leaveRequests.filter(r => r.userId === user.id);
                                    if (userRequests.length === 0) return null;
                                    const approved = userRequests.filter(r => r.status === 'approved').length;
                                    const pending = userRequests.filter(r => r.status === 'pending').length;
                                    return (
                                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                                            <div><p className="font-medium text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.department}</p></div>
                                            <div className="flex gap-4 text-sm">
                                                <div className="text-center"><span className="block font-bold text-slate-700">{userRequests.length}</span><span className="text-xs text-slate-400">Tổng</span></div>
                                                <div className="text-center"><span className="block font-bold text-green-600">{approved}</span><span className="text-xs text-slate-400">Duyệt</span></div>
                                                <div className="text-center"><span className="block font-bold text-orange-600">{pending}</span><span className="text-xs text-slate-400">Chờ</span></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tab: Charts */}
            {activeTab === 'charts' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Date Filter */}
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Từ ngày</label>
                                    <Input type="date" value={chartFromDate} onChange={e => setChartFromDate(e.target.value)} className="w-[160px]" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Đến ngày</label>
                                    <Input type="date" value={chartToDate} onChange={e => setChartToDate(e.target.value)} className="w-[160px]" />
                                </div>
                                <p className="text-sm text-slate-500">Dữ liệu biểu đồ sẽ được lọc theo khoảng thời gian này</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Leave Type Pie */}
                        <Card>
                            <CardHeader><CardTitle>Phân bổ theo loại nghỉ</CardTitle></CardHeader>
                            <CardContent className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={leaveTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                                            {leaveTypeData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip /><Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Approval Rate Donut */}
                        <Card>
                            <CardHeader><CardTitle>Tỷ lệ duyệt đơn</CardTitle></CardHeader>
                            <CardContent className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={approvalRateData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label>
                                            <Cell fill="#10b981" />
                                            <Cell fill="#ef4444" />
                                        </Pie>
                                        <Tooltip /><Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Weekday Analysis */}
                        <Card>
                            <CardHeader><CardTitle>Thống kê theo ngày trong tuần</CardTitle></CardHeader>
                            <CardContent className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weekdayData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#8b5cf6" name="Số ngày nghỉ" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Top 5 Leave Takers */}
                        <Card>
                            <CardHeader><CardTitle>Top 5 nhân viên nghỉ nhiều nhất</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {topLeaveTakers.length === 0 && <p className="text-sm text-slate-500">Không có dữ liệu</p>}
                                    {topLeaveTakers.map((t, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-2 bg-slate-50 rounded-md border cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors"
                                            onClick={() => setSelectedEmployee({ userId: t.userId, name: t.name, department: t.department })}
                                        >
                                            <div>
                                                <span className="font-medium text-blue-600 hover:underline">{i + 1}. {t.name}</span>
                                                <span className="text-xs text-slate-500 ml-2">({t.department})</span>
                                            </div>
                                            <span className="text-sm font-bold text-orange-600">{t.days} ngày</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Dept Comparison */}
                        <Card className="md:col-span-2">
                            <CardHeader><CardTitle>Top phòng ban nghỉ nhiều nhất</CardTitle></CardHeader>
                            <CardContent className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deptData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis dataKey="name" type="category" width={150} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#3b82f6" name="Số ngày nghỉ" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Tab: Calendar */}
            {activeTab === 'calendar' && (
                <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Lịch nghỉ của Team - {format(calendarMonth, 'MMMM yyyy', { locale: vi })}</CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <div key={d} className="text-xs font-medium text-slate-500 py-2">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
                            {calendarDays.map(day => {
                                const leaves = getLeaveForDay(day);
                                const hasLeave = leaves.length > 0;
                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`relative p-2 min-h-[70px] border rounded-md text-sm cursor-pointer transition-colors ${hasLeave ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                                        onClick={() => hasLeave && setSelectedDay({ date: day, leaves })}
                                    >
                                        <span className={`font-medium ${hasLeave ? 'text-orange-700' : 'text-slate-700'}`}>{format(day, 'd')}</span>
                                        {hasLeave && (
                                            <div className="mt-1 space-y-1">
                                                {leaves.slice(0, 2).map((l, i) => (
                                                    <div key={i} className="leading-tight">
                                                        <div className="text-xs font-medium text-orange-600 truncate">{l.name}</div>
                                                        <div className="text-[10px] text-orange-400 truncate">{l.department}</div>
                                                    </div>
                                                ))}
                                                {leaves.length > 2 && <div className="text-xs text-orange-500 font-medium">+{leaves.length - 2} người khác</div>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dialog for Day Details */}
            <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Danh sách nghỉ ngày {selectedDay ? format(selectedDay.date, 'dd/MM/yyyy') : ''}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[300px] overflow-auto">
                        {selectedDay?.leaves.map((l, i) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-md border space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-slate-800">{l.name}</span>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{l.department}</span>
                                </div>
                                <div className="text-xs text-slate-500">
                                    Nghỉ từ <span className="font-medium text-slate-700">{format(parseISO(l.fromDate), 'dd/MM/yyyy')}</span> đến <span className="font-medium text-slate-700">{format(parseISO(l.toDate), 'dd/MM/yyyy')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog for Employee Leave Details */}
            <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Chi tiết nghỉ phép - {selectedEmployee?.name}
                            <span className="text-sm font-normal text-slate-500 ml-2">({selectedEmployee?.department})</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[300px] overflow-auto">
                        {employeeLeaves.length === 0 && <p className="text-sm text-slate-500">Không có dữ liệu trong khoảng thời gian đã chọn</p>}
                        {employeeLeaves.map((l, i) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-md border space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-800">
                                        {format(parseISO(l.fromDate), 'dd/MM/yyyy')} - {format(parseISO(l.toDate), 'dd/MM/yyyy')}
                                    </span>
                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{l.duration} ngày</span>
                                </div>
                                <div className="text-xs text-slate-500">{l.type}</div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Tab: Export */}
            {activeTab === 'export' && (
                <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CardHeader>
                        <CardTitle>Xuất báo cáo chi tiết</CardTitle>
                        <CardDescription>Chọn khoảng thời gian và tải file Excel</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Từ ngày</label>
                                <Input type="date" value={exportFromDate} onChange={e => setExportFromDate(e.target.value)} className="w-[180px]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Đến ngày</label>
                                <Input type="date" value={exportToDate} onChange={e => setExportToDate(e.target.value)} className="w-[180px]" />
                            </div>
                            <Button onClick={handleExport} className="gap-2"><Download className="h-4 w-4" /> Xuất Excel</Button>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border text-sm text-slate-600">
                            <p className="font-medium mb-2">File Excel sẽ bao gồm:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li><strong>Sheet "Tổng hợp"</strong>: Mã NV, Họ tên, Phòng ban, số ngày theo loại, các ngày nghỉ cụ thể</li>
                                <li><strong>Sheet "Chi tiết"</strong>: Toàn bộ đơn xin nghỉ trong khoảng thời gian</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
