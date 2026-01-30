"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useApp, WorkScheduleType } from "@/context/AppContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FIXED_HOLIDAYS, LUNAR_HOLIDAYS_SOLAR } from "@/lib/holidays";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Download, Trash2, Pencil } from "lucide-react";
import { EmailSettings } from "./EmailSettings";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
    const { settings, currentUser, setWorkSchedule, addHoliday, removeHoliday, updateHoliday } = useApp();
    const router = useRouter();
    const currentYear = new Date().getFullYear();
    const [newHolidayName, setNewHolidayName] = useState("");
    const [newHolidayDate, setNewHolidayDate] = useState("");
    const [editingHoliday, setEditingHoliday] = useState<{ originalDate: string, currentName: string, currentDate: string } | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    // Redirect if not admin or director
    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'director') {
            router.push('/dashboard');
        }
    }, [currentUser, router]);

    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'director')) {
        return <div className="p-8 text-center text-slate-500">Đang kiểm tra quyền truy cập...</div>;
    }

    // Combine holidays for display
    const getHolidaysForYear = (year: number) => {
        const holidays: { date: Date; name: string; isCustom?: boolean; dateStr?: string }[] = [];
        const customDatesMap = new Set<string>();

        settings.customHolidays.forEach(h => {
            const date = new Date(h.date);
            if (date.getFullYear() === year) {
                holidays.push({ date, name: h.name, isCustom: true, dateStr: h.date });
                customDatesMap.add(h.date);
            }
        });

        FIXED_HOLIDAYS.forEach(h => {
            const date = new Date(year, h.month, h.date);
            const dateStr = format(date, "yyyy-MM-dd");

            if (!customDatesMap.has(dateStr)) {
                holidays.push({ date, name: h.name, isCustom: false });
            }
        });

        const lunarDates = LUNAR_HOLIDAYS_SOLAR[year] || [];
        lunarDates.forEach(dateStr => {
            if (!customDatesMap.has(dateStr)) {
                holidays.push({ date: new Date(dateStr), name: "Nghỉ Lễ/Tết (Âm lịch)", isCustom: false });
            }
        });

        return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    const upcomingHolidays = getHolidaysForYear(currentYear).concat(getHolidaysForYear(currentYear + 1));

    const handleAddHoliday = () => {
        if (!newHolidayDate || !newHolidayName) return;
        addHoliday(new Date(newHolidayDate), newHolidayName);
        setNewHolidayName("");
        setNewHolidayDate("");
    };

    const handleDownloadNextYear = async () => {
        const nextYear = currentYear + 1;
        const nextYearHolidays: { date: string, name: string }[] = [];
        FIXED_HOLIDAYS.forEach(h => {
            const date = new Date(nextYear, h.month, h.date);
            const dateStr = format(date, "yyyy-MM-dd");
            nextYearHolidays.push({ date: dateStr, name: h.name });
        });
        const lunarDates = LUNAR_HOLIDAYS_SOLAR[nextYear] || [];
        lunarDates.forEach(dateStr => {
            nextYearHolidays.push({ date: dateStr, name: "Nghỉ Lễ/Tết (Âm lịch)" });
        });

        for (const h of nextYearHolidays) {
            await addHoliday(new Date(h.date), h.name);
        }
    };

    const openEditDialog = (holiday: { date: Date, name: string, dateStr?: string }) => {
        if (!holiday.dateStr) return;
        setEditingHoliday({
            originalDate: holiday.dateStr,
            currentDate: holiday.dateStr,
            currentName: holiday.name
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingHoliday) return;
        await updateHoliday(editingHoliday.originalDate, editingHoliday.currentDate, editingHoliday.currentName);
        setIsEditDialogOpen(false);
        setEditingHoliday(null);
    };

    return (
        <div className="container max-w-5xl py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cài đặt hệ thống</h1>
                <p className="text-slate-500">Quản lý cấu hình chung và mẫu email thông báo.</p>
            </div>

            {/* Custom Tab Navigation */}
            <div className="flex space-x-1 border-b border-slate-200 mb-6">
                <button
                    onClick={() => setActiveTab("general")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "general"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        }`}
                >
                    Cấu hình chung
                </button>
                <button
                    onClick={() => setActiveTab("email")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "email"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        }`}
                >
                    Mẫu Email
                </button>
            </div>

            {/* Tab Content: General */}
            {activeTab === "general" && (
                <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lịch làm việc hàng tuần</CardTitle>
                            <CardDescription>
                                Thiết lập ngày làm việc tiêu chuẩn của công ty.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup
                                value={settings.workSchedule}
                                onValueChange={(val: string) => setWorkSchedule(val as WorkScheduleType)}
                                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                            >
                                <div>
                                    <RadioGroupItem value="mon-fri" id="mon-fri" className="peer sr-only" />
                                    <Label htmlFor="mon-fri" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                        <span className="mb-2 text-lg font-bold">Thứ 2 - Thứ 6</span>
                                        <span className="text-sm text-center text-muted-foreground">Nghỉ T7, CN</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="mon-sat-morning" id="mon-sat-morning" className="peer sr-only" />
                                    <Label htmlFor="mon-sat-morning" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                        <span className="mb-2 text-lg font-bold">T2 - Sáng T7</span>
                                        <span className="text-sm text-center text-muted-foreground">Nghỉ Chiều T7, CN</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="mon-sat" id="mon-sat" className="peer sr-only" />
                                    <Label htmlFor="mon-sat" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                        <span className="mb-2 text-lg font-bold">Thứ 2 - Thứ 7</span>
                                        <span className="text-sm text-center text-muted-foreground">Chỉ nghỉ CN</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Danh sách ngày nghỉ lễ</CardTitle>
                                <CardDescription>Quản lý ngày nghỉ lễ năm {currentYear} - {currentYear + 1}.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleDownloadNextYear} className="gap-1">
                                <Download className="h-4 w-4" /> Cập nhật ngày lễ
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-end gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="grid gap-2 flex-1">
                                    <Label htmlFor="h-name">Tên ngày lễ</Label>
                                    <Input id="h-name" placeholder="Ví dụ: Kỷ niệm thành lập công ty..." value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} />
                                </div>
                                <div className="grid gap-2 w-48">
                                    <Label htmlFor="h-date">Ngày</Label>
                                    <Input id="h-date" type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} />
                                </div>
                                <Button onClick={handleAddHoliday} disabled={!newHolidayName || !newHolidayDate}><Plus className="h-4 w-4 mr-2" /> Thêm</Button>
                            </div>

                            <div className="rounded-md border max-h-[400px] overflow-auto relative scrollbar-track-transparent scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300 scrollbar-thin">
                                <table className="w-full caption-bottom text-sm">
                                    <TableHeader className="bg-white">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="sticky top-0 z-20 bg-white">Ngày</TableHead>
                                            <TableHead className="sticky top-0 z-20 bg-white">Thứ</TableHead>
                                            <TableHead className="sticky top-0 z-20 bg-white">Tên ngày lễ</TableHead>
                                            <TableHead className="sticky top-0 z-20 bg-white w-[100px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {upcomingHolidays.filter(h => h.date >= new Date()).map((holiday, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{format(holiday.date, "dd/MM/yyyy")}</TableCell>
                                                <TableCell>{format(holiday.date, "EEEE", { locale: vi })}</TableCell>
                                                <TableCell>
                                                    {holiday.name}
                                                    {holiday.isCustom && <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-bold">Custom</span>}
                                                </TableCell>
                                                <TableCell className="flex justify-end gap-1">
                                                    {holiday.isCustom && holiday.dateStr && (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditDialog(holiday)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeHoliday(holiday.dateStr!)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {upcomingHolidays.filter(h => h.date >= new Date()).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Không có ngày nghỉ lễ sắp tới.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa ngày nghỉ lễ</DialogTitle>
                        <DialogDescription>Cập nhật thông tin ngày nghỉ lễ.</DialogDescription>
                    </DialogHeader>
                    {editingHoliday && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">
                                    Tên
                                </Label>
                                <Input
                                    id="edit-name"
                                    value={editingHoliday.currentName}
                                    onChange={(e) => setEditingHoliday({ ...editingHoliday, currentName: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-date" className="text-right">
                                    Ngày
                                </Label>
                                <Input
                                    id="edit-date"
                                    type="date"
                                    value={editingHoliday.currentDate}
                                    onChange={(e) => setEditingHoliday({ ...editingHoliday, currentDate: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveEdit}>Lưu thay đổi</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Tab Content: Email */}
            {activeTab === "email" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <EmailSettings />
                </div>
            )}
        </div>
    );
}
