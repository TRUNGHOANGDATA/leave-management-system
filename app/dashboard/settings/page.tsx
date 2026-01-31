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
import { Download, Trash2, Pencil, Upload, FileSpreadsheet, FileDown, Search, Plus } from "lucide-react";
import * as XLSX from 'xlsx';
import { EmailSettings } from "./EmailSettings";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
    const { settings, currentUser, setWorkSchedule, addHoliday, removeHoliday, updateHoliday, importHolidays } = useApp();
    const router = useRouter();
    const currentYear = new Date().getFullYear();

    const [searchTerm, setSearchTerm] = useState("");
    const [editingHoliday, setEditingHoliday] = useState<{ originalDate: string, currentName: string, currentDate: string } | null>(null);
    const [activeTab, setActiveTab] = useState("general");

    // Manual Add State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newHolidayName, setNewHolidayName] = useState("");
    const [newHolidayDate, setNewHolidayDate] = useState("");

    // Edit State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleManualAdd = async () => {
        if (!newHolidayDate || !newHolidayName) return;
        await addHoliday(new Date(newHolidayDate), newHolidayName);
        setNewHolidayName("");
        setNewHolidayDate("");
        setIsAddDialogOpen(false);
    };

    // Redirect if not admin or director
    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'director') {
            router.push('/dashboard');
        }
    }, [currentUser, router]);

    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'director')) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed m-8">
                <div className="bg-slate-100 p-3 rounded-full mb-4">
                    <Trash2 className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Không có quyền truy cập</h3>
                <p className="max-w-sm mt-2 text-sm">Bạn cần quyền Admin hoặc Director để truy cập trang này.</p>
            </div>
        );
    }

    // Combine holidays for display
    const getHolidaysForYear = (year: number) => {
        const holidays: { date: Date; name: string; isCustom?: boolean; dateStr?: string }[] = [];

        // Only get from settings.customHolidays (which are from DB)
        settings.customHolidays.forEach(h => {
            const date = new Date(h.date);
            // Filter by year if needed, or show all. 
            // Current year view usually expects current + next year.
            if (date.getFullYear() === year) {
                holidays.push({ date, name: h.name, isCustom: true, dateStr: h.date });
            }
        });

        return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    const upcomingHolidays = getHolidaysForYear(currentYear).concat(getHolidaysForYear(currentYear + 1));

    const filteredHolidays = upcomingHolidays.filter(h =>
        h.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                // Simple parsing assumption: Row 1 is header, Columns are Date | Name
                // Better: find index of "Ngày" and "Tên"
                if (data.length < 2) {
                    alert("File không có dữ liệu!");
                    return;
                }

                // convert data
                const holidaysToImport: { date: string, name: string }[] = [];
                // Skip header row (index 0)
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (row.length >= 2) {
                        let dateRaw = row[0]; // Could be string or excel date number
                        let name = row[1];

                        if (!dateRaw || !name) continue;

                        let dateStr = "";
                        if (typeof dateRaw === 'number') {
                            // Excel serial date
                            const dateObj = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
                            dateStr = dateObj.toISOString().split('T')[0];
                        } else {
                            // Try parsing string (dd/MM/yyyy or yyyy-MM-dd)
                            // Naive check
                            if (String(dateRaw).includes('/')) {
                                const parts = String(dateRaw).split('/');
                                if (parts.length === 3) {
                                    // dd/mm/yyyy -> yyyy-mm-dd
                                    dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                                }
                            } else {
                                dateStr = String(dateRaw); // Assume ISO
                            }
                        }

                        if (dateStr && name) {
                            holidaysToImport.push({ date: dateStr, name: String(name).trim() });
                        }
                    }
                }

                if (holidaysToImport.length > 0) {
                    importHolidays(holidaysToImport);
                    alert(`Đã nhập thành công ${holidaysToImport.length} ngày nghỉ.`);
                } else {
                    alert("Không tìm thấy dữ liệu hợp lệ trong file Excel.");
                }

            } catch (error) {
                console.error("Error parsing excel:", error);
                alert("Lỗi đọc file Excel.");
            }
        };
        reader.readAsBinaryString(file);
        // Reset input
        e.target.value = '';
    };

    const handleDownloadSample = () => {
        const wb = XLSX.utils.book_new();
        const ws_data = [
            ["Ngày", "Tên ngày lễ"],
            ["01/01/2026", "Tết Dương Lịch 2026"],
            ["30/04/2026", "Ngày Giải phóng"],
            ["02/09/2026", "Quốc khánh"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, "Mau_Ngay_Le");
        XLSX.writeFile(wb, "mau_nhap_ngay_le.xlsx");
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
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-xl">Danh sách ngày nghỉ lễ</CardTitle>
                                <CardDescription>Quản lý ngày nghỉ lễ.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileUpload}
                                    />
                                    <Button variant="outline" size="sm" className="gap-1 h-9">
                                        <FileSpreadsheet className="h-4 w-4 text-green-600" /> <span className="hidden sm:inline">Nhập Excel</span>
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleDownloadSample} className="gap-1 h-9">
                                    <FileDown className="h-4 w-4 text-slate-500" /> <span className="hidden sm:inline">Tải file mẫu</span>
                                </Button>
                                <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1 h-9">
                                    <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Thêm ngày lễ</span>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Search Filter */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    type="search"
                                    placeholder="Tìm kiếm ngày nghỉ lễ..."
                                    className="pl-9 bg-slate-50 border-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Holiday Table */}
                            <div className="rounded-lg border overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="hover:bg-slate-50">
                                            <TableHead className="font-semibold text-slate-700 w-[140px]">Ngày</TableHead>
                                            <TableHead className="font-semibold text-slate-700 w-[120px]">Thứ</TableHead>
                                            <TableHead className="font-semibold text-slate-700">Tên ngày lễ</TableHead>
                                            <TableHead className="w-[100px] text-right">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredHolidays.filter(h => h.date >= new Date(new Date().getFullYear(), 0, 1)).map((holiday, index) => (
                                            <TableRow key={index} className="hover:bg-slate-50/50">
                                                <TableCell className="font-medium tabular-nums">{format(holiday.date, "dd/MM/yyyy")}</TableCell>
                                                <TableCell className="text-slate-500">{format(holiday.date, "EEEE", { locale: vi })}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span>{holiday.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {holiday.dateStr && (
                                                            <>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full" onClick={() => openEditDialog(holiday)}>
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full" onClick={() => removeHoliday(holiday.dateStr!)}>
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredHolidays.filter(h => h.date >= new Date(new Date().getFullYear(), 0, 1)).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-slate-500 py-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Search className="h-8 w-8 text-slate-300" />
                                                        <p>{searchTerm ? "Không tìm thấy ngày nghỉ lễ nào phù hợp." : "Chưa có ngày nghỉ lễ nào. Hãy nhập từ Excel."}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
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

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thêm ngày nghỉ lễ mới</DialogTitle>
                        <DialogDescription>Nhập thông tin ngày nghỉ lễ để thêm vào hệ thống.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-name" className="text-right">
                                Tên
                            </Label>
                            <Input
                                id="new-name"
                                value={newHolidayName}
                                onChange={(e) => setNewHolidayName(e.target.value)}
                                className="col-span-3"
                                placeholder="Ví dụ: Giỗ tổ Hùng Vương"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-date" className="text-right">
                                Ngày
                            </Label>
                            <Input
                                id="new-date"
                                type="date"
                                value={newHolidayDate}
                                onChange={(e) => setNewHolidayDate(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleManualAdd} disabled={!newHolidayName || !newHolidayDate}>Thêm mới</Button>
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
