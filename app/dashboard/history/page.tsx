"use client";

import React, { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useApp } from "@/context/AppContext";
import { ArrowLeft, Clock, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";

// Helper function for status badges
const getStatusBadge = (status: string) => {
    switch (status) {
        case "approved":
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Đã duyệt</Badge>;
        case "rejected":
            return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Từ chối</Badge>;
        case "pending":
            return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Chờ duyệt</Badge>;
        case "cancelled":
            return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-slate-200">Đã huỷ</Badge>;
        default:
            return <Badge variant="outline" className="text-slate-600">Không xác định</Badge>;
    }
};

const getTypeIcon = (type: string) => {
    if (type.includes("ốm")) return <Clock className="h-4 w-4 text-orange-500 mr-2" />;
    return <CalendarDays className="h-4 w-4 text-blue-500 mr-2" />;
};

const CATEGORIES = [
    { id: "all", label: "Tất cả" },
    { id: "paid", label: "Nghỉ phép/Ốm" },
    { id: "unpaid", label: "Nghỉ không lương" },
    { id: "allowance", label: "Chế độ (Cưới/Tang)" }
];

function HistoryContent() {
    const { settings, currentUser, cancelLeaveRequest } = useApp();
    const searchParams = useSearchParams();
    const filterStatus = searchParams.get("filter");
    const viewMode = searchParams.get("view"); // 'personal' | 'manager'
    const [filterCategory, setFilterCategory] = useState("all");

    const sortedHistory = useMemo(() => {
        let data = [...settings.leaveRequests];

        // 1. Permission Filter
        if (viewMode === 'manager') {
            // Only allow if manager/director/admin
            if (!currentUser || !['manager', 'director', 'admin'].includes(currentUser.role)) {
                data = data.filter(item => item.userId === currentUser?.id);
            } else {
                // Show requests that are NOT mine (or all? usually subordinates)
                // For now, let's show ALL requests except my own for clarity, or just ALL.
                // Matching Dashboard logic: "approvedSubordinateRequests"
                // Let's filter to requests where I am the manager OR I am admin
                if (currentUser.role === 'admin' || currentUser.role === 'director') {
                    // See all
                } else {
                    // Manager: See only subordinates
                    const subordinateIds = settings.users.filter(u => u.managerId === currentUser.id).map(u => u.id);
                    data = data.filter(item => subordinateIds.includes(item.userId));
                }
            }
        } else {
            // Personal View (Default)
            data = data.filter(item => item.userId === currentUser?.id);
        }

        return data
            .filter(item => filterStatus ? item.status === filterStatus : true)
            .filter(item => {
                if (filterCategory === "all") return true;
                if (filterCategory === "unpaid") return item.type === "Nghỉ không lương";
                if (filterCategory === "allowance") return ["Nghỉ cưới (bản thân)", "Nghỉ cưới (con)", "Nghỉ tang (cha mẹ/vợ chồng/con)", "Nghỉ tang (ông bà/anh chị em)"].includes(item.type);
                if (filterCategory === "paid") {
                    return item.type !== "Nghỉ không lương" && !["Nghỉ cưới (bản thân)", "Nghỉ cưới (con)", "Nghỉ tang (cha mẹ/vợ chồng/con)", "Nghỉ tang (ông bà/anh chị em)"].includes(item.type);
                }
                return true;
            })
            .sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
    }, [settings.leaveRequests, filterStatus, filterCategory, viewMode, currentUser, settings.users]);

    return (
        <div className="container py-10 space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 flex items-center">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Lịch sử nghỉ phép</h1>
                    <p className="text-slate-500">Xem lại và theo dõi trạng thái các đơn nghỉ phép.</p>
                </div>

                {filterStatus && (
                    <Button variant="ghost" asChild>
                        <Link href="/dashboard/history">Xóa bộ lọc trạng thái</Link>
                    </Button>
                )}
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
                {CATEGORIES.map(cat => (
                    <Button
                        key={cat.id}
                        variant={filterCategory === cat.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilterCategory(cat.id)}
                        className={cn(
                            "text-sm h-9 px-4 rounded-full transition-all",
                            filterCategory === cat.id
                                ? "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                    >
                        {cat.label}
                    </Button>
                ))}
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[160px]">Loại nghỉ</TableHead>
                            <TableHead>Thời gian</TableHead>
                            <TableHead className="text-center w-[80px]">Phép</TableHead>
                            <TableHead className="text-center w-[90px]">Không lương</TableHead>
                            <TableHead className="text-center w-[80px]">Miễn trừ</TableHead>
                            <TableHead className="max-w-[150px]">Lý do</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Người duyệt</TableHead>
                            <TableHead className="text-right w-[80px]">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedHistory.length > 0 ? (
                            sortedHistory.map((request) => (
                                <TableRow key={request.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center">
                                            {getTypeIcon(request.type)}
                                            {request.type}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span className="font-medium text-slate-700">
                                                {format(new Date(request.fromDate), "dd/MM/yyyy", { locale: vi })}
                                            </span>
                                            {request.fromDate !== request.toDate && (
                                                <span className="text-slate-500">
                                                    đến {format(new Date(request.toDate), "dd/MM/yyyy", { locale: vi })}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {request.daysAnnual > 0 ? (
                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                                                {request.daysAnnual}
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {request.daysUnpaid > 0 ? (
                                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
                                                {request.daysUnpaid}
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {request.daysExempt > 0 ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                {request.daysExempt}
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[150px]">
                                        <p className="truncate text-slate-600" title={request.reason}>
                                            {request.reason || "-"}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(request.status)}
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {request.approvedBy || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {request.status === "pending" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs"
                                                onClick={() => cancelLeaveRequest(request.id)}
                                            >
                                                Huỷ đơn
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                    Không có dữ liệu phù hợp
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

export default function HistoryPage() {
    return (
        <Suspense fallback={<div>Đang tải lịch sử...</div>}>
            <HistoryContent />
        </Suspense>
    );
}
