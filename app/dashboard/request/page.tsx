"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft, Clock, Info, ChevronDown, Check, Users, ChevronsUpDown } from "lucide-react";
import { format, differenceInCalendarDays, addDays, eachDayOfInterval, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { LEGAL_ALLOWANCES } from "@/lib/constants";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DateRange } from "react-day-picker";
import { isHoliday, isWorkDay } from "@/lib/holidays";
import { useApp } from "@/context/AppContext";
import { calculateEntitlement } from "@/lib/leave-utils";

export default function LeaveRequestPage() {
    const { settings, currentUser, addLeaveRequest } = useApp();
    const router = useRouter();

    // Grouped colleagues logic
    const groupedColleagues = useMemo(() => {
        if (!settings.users || !currentUser) return { manager: [], department: [], others: [] };

        const all = settings.users.filter(u => u.id !== currentUser.id);
        const managerId = currentUser.managerId;
        const myDept = currentUser.department;

        const manager = all.filter(u => u.id === managerId);
        const dept = all.filter(u => u.id !== managerId && u.department === myDept);
        const others = all.filter(u => u.id !== managerId && u.department !== myDept);

        return { manager, department: dept, others };
    }, [settings.users, currentUser]);

    const [openCombobox, setOpenCombobox] = useState(false);

    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [leaveType, setLeaveType] = useState("Nghỉ phép năm");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // === LEAVE CALCULATION LOGIC ===
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
                    annualUsed += req.duration;
                }
            }
        }

        return { annualLeaveUsed: annualUsed, unpaidLeaveUsed: unpaidUsed };
    }, [settings.leaveRequests, currentUser, currentYear]);

    // Use Dynamic Balance from AppContext + Future Projection
    // If user selects a future date, check entitlement at that date.
    const currentEntitlement = useMemo(() => {
        const targetDate = dateRange?.to || new Date();
        return calculateEntitlement(currentUser, targetDate);
    }, [currentUser, dateRange?.to]);

    // Available Balance for THIS request
    // We deduct what has been *approved* so far this year.
    // Note: This assumes annualLeaveUsed includes all approved requests in the current year.
    const leaveLeft = Math.max(0, currentEntitlement - annualLeaveUsed);

    const leaveLeftPercent = currentEntitlement > 0
        ? Math.round((leaveLeft / currentEntitlement) * 100)
        : 0;

    // Get Recent History
    const recentHistory = useMemo(() => {
        return [...settings.leaveRequests]
            .filter(r => r.userId === currentUser?.id)
            .sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime())
            .slice(0, 5);
    }, [settings.leaveRequests, currentUser]);

    // State for Handover person
    const [handoverPerson, setHandoverPerson] = useState("");

    // State for Daily Selections (Morning/Afternoon)
    // Key: YYYY-MM-DD
    type DaySession = {
        morning: boolean;
        afternoon: boolean;
        isHoliday?: boolean;
        holidayName?: string;
        isWeekend?: boolean;
        isHalfDayOff?: boolean; // For Sat afternoon off
    };
    const [dailySelections, setDailySelections] = useState<Record<string, DaySession>>({});

    // Effect: Update dailySelections when dateRange or workSchedule changes
    useEffect(() => {
        if (!dateRange?.from) {
            setDailySelections({});
            return;
        }

        const start = dateRange.from;
        const end = dateRange.to || start;

        try {
            const days = eachDayOfInterval({ start, end });
            setDailySelections(prev => {
                const newSelections: Record<string, DaySession> = {};
                days.forEach(day => {
                    const key = format(day, "yyyy-MM-dd");
                    const holiday = isHoliday(day, settings.customHolidays);
                    const working = isWorkDay(day, settings.workSchedule);
                    const dayOfWeek = day.getDay(); // 0 is Sunday, 6 is Saturday

                    if (holiday) {
                        newSelections[key] = { morning: false, afternoon: false, isHoliday: true, holidayName: holiday };
                    } else if (!working) {
                        newSelections[key] = { morning: false, afternoon: false, isWeekend: true };
                    } else {
                        // Working day logic
                        let morning = true;
                        let afternoon = true;
                        let isHalfDayOff = false;

                        // Handle Mon-Sat Morning Special Case
                        if (settings.workSchedule === 'mon-sat-morning' && dayOfWeek === 6) {
                            afternoon = false;
                            isHalfDayOff = true;
                        }

                        // Preserve existing selection if valid
                        if (prev[key] && !prev[key].isHoliday && !prev[key].isWeekend) {
                            // If previously selected, keep it, but enforce half-day off constraint if needed
                            newSelections[key] = {
                                ...prev[key],
                                afternoon: isHalfDayOff ? false : prev[key].afternoon,
                                isHalfDayOff
                            };
                        } else {
                            newSelections[key] = { morning, afternoon, isHalfDayOff };
                        }
                    }
                });
                return newSelections;
            });
        } catch (e) {
            setDailySelections({});
        }
    }, [dateRange, settings.workSchedule]);

    // Calculate total days
    const totalDays = useMemo(() => {
        return Object.values(dailySelections).reduce((acc, session) => {
            return acc + (session.morning ? 0.5 : 0) + (session.afternoon ? 0.5 : 0);
        }, 0);
    }, [dailySelections]);

    // Deduction Preview Message
    const deductionMessage = useMemo(() => {
        if (totalDays === 0 || !currentUser) return null;
        if (leaveType === "Nghỉ không lương") return "(Không trừ phép năm)";

        const allowance = LEGAL_ALLOWANCES[leaveType] || 0;
        if (allowance > 0) {
            if (totalDays <= allowance) return "(Miễn trừ - Chế độ)";
            // Check remaining days after allowance
            const remainingRequest = totalDays - allowance;

            if (remainingRequest <= leaveLeft) {
                return `(Trừ ${remainingRequest} phép năm, ${allowance} chế độ)`;
            }
            return `(Trừ ${leaveLeft} phép năm, ${remainingRequest - leaveLeft} không lương, ${allowance} chế độ)`;
        }

        // Logic for Annual Leave (Nghỉ phép năm)
        if (leaveType === "Nghỉ phép năm") {
            if (totalDays <= leaveLeft) {
                return "(Tính vào phép năm)";
            }
            // Not enough balance -> Split
            const unpaid = Number((totalDays - leaveLeft).toFixed(1));
            return (
                <span className="text-amber-600 font-semibold">
                    (Vượt quá phép năm: {leaveLeft} phép, {unpaid} không lương)
                </span>
            );
        }

        // Default for 'Khác' or unmapped types
        if (totalDays > leaveLeft) {
            const unpaid = Number((totalDays - leaveLeft).toFixed(1));
            return `(Dự kiến: ${leaveLeft} phép, ${unpaid} không lương)`;
        }

        return "(Tính vào phép năm)";
    }, [leaveType, totalDays, currentUser, leaveLeft]);

    // Helper to toggle sessions
    const toggleSession = (dateStr: string, session: 'morning' | 'afternoon') => {
        const currentSession = dailySelections[dateStr];
        // Prevent toggling if it's a holiday, non-working weekend, or specifically off (half-day)
        if (currentSession?.isHoliday || currentSession?.isWeekend) return;
        if (session === 'afternoon' && currentSession?.isHalfDayOff) return;

        setDailySelections(prev => ({
            ...prev,
            [dateStr]: {
                ...prev[dateStr],
                [session]: !prev[dateStr][session]
            }
        }));
    };

    const handleSubmit = async () => {
        if (!currentUser) return;
        if (isSubmitting) return; // Prevent double submission
        if (!dateRange?.from) {
            alert("Vui lòng chọn ngày nghỉ!");
            return;
        }

        setIsSubmitting(true);

        // Transform dailySelections to details
        const details = Object.entries(dailySelections)
            .filter(([_, session]) => (session.morning || session.afternoon) && !session.isHoliday && !session.isWeekend)
            .map(([date, session]) => ({
                date,
                session: (session.morning && session.afternoon) ? "full" : session.morning ? "morning" : "afternoon"
            }));

        // Calculate breakdown: daysAnnual, daysUnpaid, daysExempt
        let daysAnnual = 0;
        let daysUnpaid = 0;
        let daysExempt = 0;
        let exemptionNote = "";

        if (leaveType === "Nghỉ không lương") {
            // All days are unpaid
            daysUnpaid = totalDays;
            exemptionNote = `${totalDays} ngày không lương`;
        } else {
            const allowance = LEGAL_ALLOWANCES[leaveType] || 0;

            if (allowance > 0) {
                // Legal exemption type (cưới, tang, etc.)
                daysExempt = Math.min(totalDays, allowance);
                const remaining = totalDays - daysExempt;

                if (remaining > 0) {
                    // Check if user has remaining annual leave
                    daysAnnual = Math.min(remaining, leaveLeft);
                    daysUnpaid = remaining - daysAnnual;
                }

                // Build exemption note
                const parts = [];
                if (daysAnnual > 0) parts.push(`${daysAnnual} phép`);
                if (daysUnpaid > 0) parts.push(`${daysUnpaid} không lương`);
                if (daysExempt > 0) parts.push(`${daysExempt} miễn trừ`);
                exemptionNote = parts.join(" + ");
            } else {
                // Regular annual leave type
                daysAnnual = Math.min(totalDays, leaveLeft);
                daysUnpaid = totalDays - daysAnnual;

                const parts = [];
                if (daysAnnual > 0) parts.push(`${daysAnnual} phép`);
                if (daysUnpaid > 0) parts.push(`${daysUnpaid} không lương`);
                exemptionNote = parts.join(" + ") || "Tính vào phép năm";
            }
        }

        const newRequest = {
            id: Math.random().toString(36).substr(2, 9),
            type: leaveType as any,
            fromDate: format(dateRange.from, "yyyy-MM-dd"),
            toDate: format(dateRange.to || dateRange.from, "yyyy-MM-dd"),
            duration: totalDays,
            daysAnnual: daysAnnual,
            daysUnpaid: daysUnpaid,
            daysExempt: daysExempt,
            status: "pending" as const,
            reason: reason,
            userId: currentUser.id,
            exemptionNote: exemptionNote,
            requestDetails: details as any
        };

        // Fire and forget: Navigate immediately for instant feedback
        // The addLeaveRequest function already does optimistic update
        addLeaveRequest(newRequest);
        router.push("/dashboard");
    };

    return (
        <div className="container max-w-4xl py-10">
            <div className="mb-6">
                <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary flex items-center mb-2">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại Dashboard
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tạo đơn xin nghỉ</h1>
                        <p className="text-slate-500">Điền thông tin chi tiết về đơn nghỉ phép của bạn.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Form Area */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>Thông tin đơn</CardTitle>
                            <CardDescription>Chọn khoảng thời gian và chi tiết các buổi nghỉ.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Leave Type & Replacement */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Loại đơn nghỉ</Label>
                                    <Select value={leaveType} onValueChange={setLeaveType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn loại nghỉ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Nghỉ phép năm">Nghỉ phép năm</SelectItem>
                                            <SelectItem value="Nghỉ ốm">Nghỉ ốm (Trừ phép)</SelectItem>
                                            <SelectItem value="Nghỉ việc riêng">Nghỉ việc riêng (Trừ phép)</SelectItem>
                                            <SelectItem value="Nghỉ cưới (bản thân)">🎊 Nghỉ cưới (3 ngày theo luật)</SelectItem>
                                            <SelectItem value="Nghỉ cưới (con)">🎊 Nghỉ cưới con (1 ngày theo luật)</SelectItem>
                                            <SelectItem value="Nghỉ tang (cha mẹ/vợ chồng/con)">⚫ Nghỉ tang (3 ngày theo luật)</SelectItem>
                                            <SelectItem value="Nghỉ tang (ông bà/anh chị em)">⚫ Nghỉ tang ông bà/anh chị em (1 ngày)</SelectItem>
                                            <SelectItem value="Nghỉ không lương">Nghỉ không lương</SelectItem>
                                            <SelectItem value="Khác">Khác</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Bàn giao công việc cho <span className="text-muted-foreground font-normal text-xs">(nếu có)</span></Label>
                                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openCombobox}
                                                className="w-full justify-between"
                                            >
                                                {handoverPerson
                                                    ? settings.users.find((u) => u.id === handoverPerson)?.name
                                                    : "Chọn đồng nghiệp..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Tìm tên đồng nghiệp..." />
                                                <CommandList>
                                                    <CommandEmpty>Không tìm thấy nhân viên.</CommandEmpty>

                                                    {/* Prioritized Groups */}
                                                    {groupedColleagues.manager.length > 0 && (
                                                        <CommandGroup heading="Quản lý trực tiếp">
                                                            {groupedColleagues.manager.map((u) => (
                                                                <CommandItem
                                                                    key={u.id}
                                                                    value={`${u.name} ${u.id}`}
                                                                    onSelect={() => {
                                                                        setHandoverPerson(u.id === handoverPerson ? "" : u.id)
                                                                        setOpenCombobox(false)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            handoverPerson === u.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span>{u.name}</span>
                                                                        <span className="text-xs text-muted-foreground">Manager</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    )}

                                                    {groupedColleagues.department.length > 0 && (
                                                        <CommandGroup heading={`Cùng phòng ban (${currentUser?.department})`}>
                                                            {groupedColleagues.department.map((u) => (
                                                                <CommandItem
                                                                    key={u.id}
                                                                    value={`${u.name} ${u.id}`}
                                                                    onSelect={() => {
                                                                        setHandoverPerson(u.id === handoverPerson ? "" : u.id)
                                                                        setOpenCombobox(false)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            handoverPerson === u.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span>{u.name}</span>
                                                                        <span className="text-xs text-muted-foreground">{u.role}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    )}

                                                    {groupedColleagues.others.length > 0 && (
                                                        <CommandGroup heading="Phòng ban khác">
                                                            {groupedColleagues.others.map((u) => (
                                                                <CommandItem
                                                                    key={u.id}
                                                                    value={`${u.name} ${u.id}`}
                                                                    onSelect={() => {
                                                                        setHandoverPerson(u.id === handoverPerson ? "" : u.id)
                                                                        setOpenCombobox(false)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            handoverPerson === u.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span>{u.name}</span>
                                                                        <span className="text-xs text-muted-foreground">{u.department || 'N/A'}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    )}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* Date Selection - Google Sheets Style */}
                            <div className="space-y-4 border-t border-slate-100 pt-4">
                                <div className="flex justify-between items-center">
                                    <Label>Thời gian nghỉ</Label>
                                    {totalDays > 0 && (
                                        <div className="text-right flex flex-col items-end">
                                            <div className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full inline-block">
                                                Tổng cộng: {totalDays} ngày
                                            </div>
                                            {deductionMessage && (
                                                <span className="text-[11px] text-slate-500 font-medium mt-1 mr-1">
                                                    {deductionMessage}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    {/* Start Date */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-500 uppercase">Ngày bắt đầu</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal border-slate-300 hover:bg-slate-50 hover:text-slate-900",
                                                        !dateRange?.from && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                                    {dateRange?.from ? format(dateRange.from, "dd/MM/yyyy", { locale: vi }) : <span>Chọn ngày</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[360px] p-2 flex justify-center" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={dateRange?.from}
                                                    onSelect={(date) => setDateRange(prev => ({ from: date, to: prev?.to }))}
                                                    initialFocus
                                                    captionLayout="dropdown"
                                                    fromYear={2024}
                                                    toYear={2030}
                                                    locale={vi}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* End Date */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-500 uppercase">Ngày kết thúc</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal border-slate-300 hover:bg-slate-50 hover:text-slate-900",
                                                        !dateRange?.to && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                                    {dateRange?.to ? format(dateRange.to, "dd/MM/yyyy", { locale: vi }) : <span>Chọn ngày</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[360px] p-2 flex justify-center" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={dateRange?.to}
                                                    onSelect={(date) => setDateRange(prev => ({ from: prev?.from, to: date }))}
                                                    initialFocus
                                                    captionLayout="dropdown"
                                                    fromYear={2024}
                                                    toYear={2030}
                                                    locale={vi}
                                                    disabled={(date) => dateRange?.from ? date < dateRange.from : false}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Detailed Daily Selection */}
                                {dateRange?.from && Object.keys(dailySelections).length > 0 && (
                                    <div className="mt-4 space-y-3">
                                        <Label className="text-sm font-medium">Chi tiết ngày nghỉ</Label>
                                        <div className="rounded-md border border-slate-200 divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                            {Object.entries(dailySelections).sort().map(([dateStr, session]) => {
                                                const date = new Date(dateStr);
                                                const isHolidayDay = !!session.isHoliday;
                                                const isWeekendDay = !!session.isWeekend;
                                                const isHalfDayOff = !!session.isHalfDayOff;
                                                const isDisabled = isHolidayDay || isWeekendDay;

                                                return (
                                                    <div key={dateStr} className={cn(
                                                        "flex items-center justify-between p-3",
                                                        isDisabled ? "bg-slate-50" : "bg-white"
                                                    )}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "flex flex-col items-center justify-center w-10 h-10 rounded-md border text-xs font-medium",
                                                                isDisabled ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-blue-50 text-blue-700 border-blue-100"
                                                            )}>
                                                                <span>{format(date, "dd")}</span>
                                                                <span className="text-[10px] uppercase">{format(date, "EEE", { locale: vi })}</span>
                                                            </div>
                                                            <div>
                                                                <p className={cn("text-sm font-medium", isDisabled && "text-slate-500")}>
                                                                    {format(date, "EEEE, dd/MM/yyyy", { locale: vi })}
                                                                </p>
                                                                {isHolidayDay && (
                                                                    <p className="text-xs text-red-500 font-medium">{session.holidayName}</p>
                                                                )}
                                                                {isWeekendDay && (
                                                                    <p className="text-xs text-slate-400">Ngày nghỉ hàng tuần</p>
                                                                )}
                                                                {isHalfDayOff && (
                                                                    <p className="text-xs text-slate-400">Nghỉ chiều T7</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {!isDisabled ? (
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant={session.morning ? "default" : "outline"}
                                                                    size="sm"
                                                                    onClick={() => toggleSession(dateStr, 'morning')}
                                                                    className={cn(
                                                                        "w-16 h-8 text-xs",
                                                                        session.morning ? "bg-blue-600 hover:bg-blue-700" : "text-slate-600"
                                                                    )}
                                                                >
                                                                    Sáng
                                                                </Button>
                                                                <Button
                                                                    variant={session.afternoon ? "default" : "outline"}
                                                                    size="sm"
                                                                    onClick={() => toggleSession(dateStr, 'afternoon')}
                                                                    disabled={isHalfDayOff}
                                                                    className={cn(
                                                                        "w-16 h-8 text-xs",
                                                                        session.afternoon ? "bg-blue-600 hover:bg-blue-700" : "text-slate-600",
                                                                        isHalfDayOff && "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400"
                                                                    )}
                                                                >
                                                                    Chiều
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-slate-400 italic px-4">
                                                                Không tính phép
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Lý do nghỉ</Label>
                                <Textarea
                                    placeholder="Vui lòng ghi rõ lý do..."
                                    className="min-h-[100px]"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>

                        </CardContent>
                        <CardFooter className="flex justify-between bg-slate-50/50 border-t border-slate-100 p-6">
                            <Button variant="outline" asChild>
                                <Link href="/dashboard">Hủy bỏ</Link>
                            </Button>
                            <Button
                                className="w-32 shadow-lg shadow-blue-900/20 bg-blue-600 hover:bg-blue-700"
                                onClick={handleSubmit}
                            >
                                Gửi đơn
                            </Button>
                        </CardFooter>
                    </Card>
                </div >

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* User Info & Leave Balance */}
                    <Card className="border-indigo-100 shadow-sm bg-indigo-50/30 overflow-hidden">
                        <CardHeader className="bg-indigo-50/50 pb-3 border-b border-indigo-100">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                                    {currentUser?.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">{currentUser?.name}</h3>
                                    <p className="text-xs text-slate-500">{currentUser?.department}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Phép năm còn lại</span>
                                    <span className="text-xs text-indigo-600 font-bold">{leaveLeftPercent}%</span>
                                </div>
                                <Progress value={leaveLeftPercent} className="h-2.5 bg-indigo-100" />
                                <div className="flex justify-between items-baseline mt-2">
                                    <span className="text-3xl font-bold text-indigo-700">{leaveLeft}</span>
                                    <span className="text-xs text-slate-500">/ {currentEntitlement} ngày có thể dùng</span>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 bg-white rounded-md p-2 border border-indigo-100 space-y-1.5">
                                <div className="flex justify-between">
                                    <span>Đã dùng (phép năm):</span>
                                    <span className="font-medium text-slate-700">{annualLeaveUsed} ngày</span>
                                </div>
                                {unpaidLeaveUsed > 0 && (
                                    <div className="flex justify-between text-amber-600">
                                        <span>Không lương:</span>
                                        <span className="font-semibold">{unpaidLeaveUsed} ngày</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-1 border-t border-indigo-100 mt-1">
                                    <span>Quản lý duyệt:</span>
                                    <span className="font-medium text-slate-700">{settings.users.find(u => u.id === currentUser?.managerId)?.name}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent History Widget */}
                    <Card className="border-slate-200">
                        <CardHeader className="pb-3 pt-4">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                Lịch sử gần đây
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {recentHistory.length > 0 ? (
                                    recentHistory.map(req => (
                                        <div key={req.id} className="p-3 hover:bg-slate-50 transition-colors text-sm">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-medium text-slate-900 line-clamp-1">{req.type}</span>
                                                <Badge variant="outline" className={cn("text-[10px] px-1 py-0 h-5",
                                                    req.status === 'approved' ? "bg-green-50 text-green-700 border-green-200" :
                                                        req.status === 'pending' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                            "bg-red-50 text-red-700 border-red-200"
                                                )}>
                                                    {req.status === 'approved' ? 'Đã duyệt' : req.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>{format(new Date(req.fromDate), "dd/MM")} - {format(new Date(req.toDate), "dd/MM")}</span>
                                                <span>{req.duration} ngày</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-xs text-slate-400">Chưa có dữ liệu</div>
                                )}
                            </div>
                            {recentHistory.length > 0 && (
                                <div className="p-2 border-t border-slate-100">
                                    <Button variant="ghost" size="sm" className="w-full text-xs h-8 text-blue-600" asChild>
                                        <Link href="/dashboard/history">Xem tất cả</Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-100">
                        <CardContent className="p-4 flex gap-3">
                            <Info className="h-5 w-5 text-blue-600 shrink-0" />
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">Lưu ý quan trọng</p>
                                <p className="opacity-90 leading-relaxed">
                                    Vui lòng nộp đơn trước ít nhất 2 ngày đối với nghỉ phép năm. Đơn sẽ được gửi đến quản lý trực tiếp để phê duyệt.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div >
            </div >
        </div >
    );
}
