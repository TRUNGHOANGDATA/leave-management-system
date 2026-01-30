"use client"

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Download, Search, FileSpreadsheet, Trash2, Edit, Filter, Save, ChevronDown, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useApp, UserRole, User } from "@/context/AppContext";

// Extended Employee Interface to include Role
interface Employee {
    order: string;
    id: string;
    fullName: string;
    jobTitle: string;
    department: string;
    workLocation: string;
    managerId: string;
    managerName: string;
    email: string;
    role: UserRole; // Added role field
    employeeCode?: string;
}

const toTitleCase = (str: string) => {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Combobox Input Component for Dept/Location
const ComboboxInput = ({
    value,
    onChange,
    options,
    placeholder,
    id
}: {
    value: string,
    onChange: (val: string) => void,
    options: string[],
    placeholder: string,
    id: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(inputValue.toLowerCase())
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);
        setIsOpen(true);
    };

    const handleSelect = (opt: string) => {
        setInputValue(opt);
        onChange(opt);
        setIsOpen(false);
    };

    return (
        <div className="relative col-span-3">
            <Input
                ref={inputRef}
                id={id}
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                placeholder={placeholder}
                className="pr-8"
            />
            <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-white shadow-lg">
                    {filteredOptions.map((opt, idx) => (
                        <div
                            key={idx}
                            className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-slate-100"
                            onMouseDown={() => handleSelect(opt)}
                        >
                            {opt === value && <Check className="mr-2 h-4 w-4 text-blue-600" />}
                            <span className={opt === value ? "font-medium" : ""}>{opt}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// -----------------------------------------------------------------------------
// Manager Search Input (Select ID + Name)
// -----------------------------------------------------------------------------
interface ManagerOption {
    id: string;
    name: string;
    role: string;
}

const ManagerSearchInput = ({
    value, // managerId
    onSelect, // (id, name) => void
    options,
    placeholder
}: {
    value: string,
    onSelect: (id: string, name: string) => void,
    options: ManagerOption[],
    placeholder: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Initial display name based on ID
    const selectedManager = options.find(o => o.id === value);
    const [displayValue, setDisplayValue] = useState(selectedManager ? selectedManager.name : "");

    // Sync when value changes externally
    useEffect(() => {
        const found = options.find(o => o.id === value);
        setDisplayValue(found ? found.name : "");
        // If no ID but we have text, keep text? No, strict selection for ID.
    }, [value, options]);

    const filteredOptions = options.filter(opt =>
        opt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        setDisplayValue(newValue);
        setIsOpen(true);
    };

    const handleSelect = (opt: ManagerOption) => {
        setDisplayValue(opt.name);
        setSearchTerm("");
        onSelect(opt.id, opt.name);
        setIsOpen(false);
    };

    return (
        <div className="relative col-span-3">
            <Input
                ref={inputRef}
                value={isOpen ? searchTerm : displayValue} // Show search term when open, else name
                onChange={handleInputChange}
                onFocus={() => {
                    setSearchTerm(""); // Clear search to show all or keep? Let's clear to show suggestions
                    setIsOpen(true);
                }}
                onBlur={() => setTimeout(() => {
                    setIsOpen(false);
                    // Revert to valid name if not selected?
                    const found = options.find(o => o.id === value);
                    if (found) setDisplayValue(found.name);
                }, 200)}
                placeholder={placeholder}
                className="pr-8"
            />
            <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-white shadow-lg">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <div
                                key={opt.id}
                                className="flex flex-col px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 border-b border-slate-50 last:border-0"
                                onMouseDown={() => handleSelect(opt)}
                            >
                                <span className="font-medium text-slate-900">{opt.name}</span>
                                <div className="flex justify-between mt-0.5">
                                    <span className="text-xs text-slate-500">{opt.role.toUpperCase()}</span>
                                    <span className="text-xs text-slate-400 font-mono">{opt.id}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-slate-500 italic">Không tìm thấy quản lý</div>
                    )}
                </div>
            )}
        </div>
    );
};

// Updated Employee Edit Dialog with Role Selection
const EmployeeEditDialog = ({
    employee,
    isOpen,
    onClose,
    onSave,
    departmentOptions,
    locationOptions,
    managerOptions // New prop
}: {
    employee: Employee | null,
    isOpen: boolean,
    onClose: () => void,
    onSave: (emp: Employee) => void,
    departmentOptions: string[],
    locationOptions: string[],
    managerOptions: ManagerOption[]
}) => {
    const [formData, setFormData] = useState<Employee | null>(null);

    useEffect(() => {
        if (employee && isOpen) {
            setFormData({ ...employee });
        }
    }, [employee, isOpen]);

    const handleChange = useCallback((field: keyof Employee, value: string) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    }, []);

    // Filter manager options based on selected role
    const filteredManagerOptions = useMemo(() => {
        if (!formData) return managerOptions;
        // If Role is Manager -> Direct Manager should be Director or Admin
        if (formData.role === 'manager') {
            return managerOptions.filter(o => ['director', 'admin'].includes(o.role));
        }
        return managerOptions;
    }, [managerOptions, formData?.role]);

    const handleSave = () => {
        if (formData) {
            onSave(formData);
        }
    };

    if (!formData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] overflow-visible"> {/* overflow visible for dropdown */}
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa thông tin nhân viên</DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin chi tiết và quyền truy cập (Role).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Employee ID Hidden */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-name" className="text-right">Họ và tên</Label>
                        <Input
                            id="edit-name"
                            value={formData.fullName}
                            onChange={(e) => handleChange('fullName', e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-email" className="text-right">Email</Label>
                        <Input
                            id="edit-email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-role" className="text-right font-bold text-blue-600">Phân quyền</Label>
                        <div className="col-span-3">
                            <Select value={formData.role} onValueChange={(val) => handleChange('role', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn quyền hạn" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="employee">Nhân viên (Employee)</SelectItem>
                                    <SelectItem value="manager">Quản lý (Manager)</SelectItem>
                                    <SelectItem value="director">Giám đốc (Director)</SelectItem>
                                    <SelectItem value="admin">Admin Hệ thống</SelectItem>
                                    <SelectItem value="hr">Nhân sự (HR)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-job" className="text-right">Chức danh</Label>
                        <Input
                            id="edit-job"
                            value={formData.jobTitle}
                            onChange={(e) => handleChange('jobTitle', e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-dept" className="text-right">Phòng ban</Label>
                        <ComboboxInput
                            id="edit-dept"
                            value={formData.department}
                            onChange={(val) => handleChange('department', val)}
                            options={departmentOptions}
                            placeholder="Chọn hoặc nhập phòng ban..."
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-loc" className="text-right">Nơi làm việc</Label>
                        <ComboboxInput
                            id="edit-loc"
                            value={formData.workLocation}
                            onChange={(val) => handleChange('workLocation', val)}
                            options={locationOptions}
                            placeholder="Chọn hoặc nhập nơi làm việc..."
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-manager" className="text-right">QLTT/TBP</Label>
                        <ManagerSearchInput
                            value={formData.managerId}
                            options={filteredManagerOptions}
                            placeholder="Tìm kiếm quản lý..."
                            onSelect={(id, name) => {
                                handleChange('managerId', id);
                                handleChange('managerName', name);
                            }}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Huỷ</Button>
                    <Button type="submit" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function EmployeeManagementPage() {
    const { settings, setUsers, updateUser, removeUser, addUser, currentUser } = useApp(); // Connect to App Context
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [isLoading, setIsLoading] = useState(false);

    // Edit & Delete State
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Initial Sync with AppContext (Mock DB)
    useEffect(() => {
        if (settings.users.length > 0) {
            let sourceUsers = settings.users;

            // Filter: Manager only sees their department
            if (currentUser && currentUser.role === 'manager') {
                sourceUsers = sourceUsers.filter(u => u.department === currentUser.department);
            }
            // Admin / Director sees all -> no filter needed

            const mappedEmployees: Employee[] = sourceUsers.map((u, index) => ({
                order: String(index + 1),
                id: u.id,
                fullName: u.name,
                email: u.email,
                role: u.role,
                department: u.department,
                employeeCode: u.employeeCode,
                jobTitle: u.role === 'manager' ? 'Quản lý' : u.role === 'director' ? 'Giám đốc' : 'Nhân viên',
                workLocation: "Văn phòng", // Default
                managerId: u.managerId || "",
                // Try to find Name by ID, fallback to ID
                managerName: settings.users.find(m => m.id === u.managerId)?.name || u.managerId || ""
            }));
            setEmployees(mappedEmployees);
        }
    }, [settings.users, currentUser]); // Run when users or currentUser changes

    // Sync back to AppContext whenever employees list changes (Save/Delete/Import)
    const syncToAppContext = (newEmployees: Employee[]) => {
        const newUsers: User[] = newEmployees.map(e => ({
            id: e.id,
            name: e.fullName,
            email: e.email,
            role: e.role,
            department: e.department,
            managerId: e.managerId,
            employeeCode: e.employeeCode,
            avatarUrl: `/avatars/${String(Math.floor(Math.random() * 5) + 1).padStart(2, '0')}.png` // Random avatar
        }));
        setUsers(newUsers);
    };

    // Filter lists
    const departments = useMemo(() => {
        const depts = new Set(employees.map(e => e.department).filter(Boolean));
        return Array.from(depts).sort();
    }, [employees]);

    const workLocations = useMemo(() => {
        const locs = new Set(employees.map(e => e.workLocation).filter(Boolean));
        return Array.from(locs).sort();
    }, [employees]);

    // Candidates for Manager role (Admin, Director, Manager)
    const managerOptions = useMemo(() => {
        return settings.users
            .filter(u => ['manager', 'director', 'admin'].includes(u.role))
            .map(u => ({
                id: u.id,
                name: u.name,
                role: u.role
            }));
    }, [settings.users]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                const newEmployees: Employee[] = [];

                for (let i = 1; i < data.length; i++) {
                    const row: any = data[i];
                    if (row[1] || row[2]) {
                        newEmployees.push({
                            order: String(row[0] || ""),
                            id: String(row[1] || "").trim(),
                            fullName: toTitleCase(String(row[2] || "").trim()),
                            jobTitle: String(row[3] || "").trim(),
                            department: String(row[4] || "").trim(),
                            workLocation: String(row[5] || "").trim(),
                            managerId: String(row[6] || "").trim(),
                            managerName: toTitleCase(String(row[7] || "").trim()),
                            email: String(row[8] || "").trim(),
                            role: 'employee' // Default role for imported users
                        });
                    }
                }

                // Merge & Dedup logic
                const empMap = new Map<string, Employee>();
                employees.forEach(e => empMap.set(e.id, e));
                // Overwrite with new import (keep existing roles if match found? For simplicity, we trust Excel or default to employee if new)
                newEmployees.forEach(e => {
                    if (e.id) {
                        // Preserve role if exists, else default
                        const existing = empMap.get(e.id);
                        if (existing) e.role = existing.role;
                        empMap.set(e.id, e);
                    }
                });
                const distinctEmployees = Array.from(empMap.values());

                setEmployees(distinctEmployees);
                syncToAppContext(distinctEmployees); // SYNC

                toast({
                    title: "Nhập dữ liệu thành công",
                    description: `Đã xử lý ${newEmployees.length} dòng. Tổng: ${distinctEmployees.length}`,
                });
            } catch (error) {
                console.error(error);
                toast({ variant: "destructive", title: "Lỗi đọc file", description: "Không thể đọc file Excel." });
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };

        reader.readAsBinaryString(file);
    };

    const triggerUpload = () => fileInputRef.current?.click();

    const downloadTemplate = () => {
        const headers = ["STT", "Mã nhân viên", "Họ và tên", "Chức danh", "Phòng ban", "Nơi làm việc", "MNV QLTT/TBP", "QLTT/TBP", "Email"];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 25 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Nhan_Su");
        XLSX.writeFile(wb, "Danh_Sach_Nhan_Su_Template.xlsx");
    };

    // --- Actions ---
    const handleDelete = async () => {
        if (!deletingEmployeeId) return;

        await removeUser(deletingEmployeeId);

        setDeletingEmployeeId(null);
        toast({ title: "Đã xoá nhân viên" });
    };

    const handleSaveEdit = useCallback(async (updatedEmp: Employee) => {
        // Map Employee back to User for DB update
        const userToUpdate: User = {
            id: updatedEmp.id || "",
            name: updatedEmp.fullName,
            email: updatedEmp.email,
            role: updatedEmp.role,
            department: updatedEmp.department,
            managerId: updatedEmp.managerId || undefined,
            // Preserve avatar if we had it in settings, or let backend handle
            avatarUrl: settings.users.find(u => u.id === updatedEmp.id)?.avatarUrl
        };

        await updateUser(userToUpdate);
        setEditingEmployee(null);
        toast({ title: "Đã cập nhật thông tin nhân viên" });
    }, [updateUser, toast, settings.users]);

    // Filter employees - Memoized
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDept = departmentFilter === "all" || emp.department === departmentFilter;
            return matchesSearch && matchesDept;
        });
    }, [employees, searchTerm, departmentFilter]);

    return (
        <div className="container py-10 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quản lý nhân sự</h1>
                    <p className="text-slate-500">Quản lý danh sách nhân viên và phân quyền hệ thống.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={downloadTemplate}>
                        <Download className="mr-2 h-4 w-4" /> Tải mẫu
                    </Button>
                    <Button onClick={triggerUpload} className="bg-green-600 hover:bg-green-700 text-white">
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Nhập Excel
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="whitespace-nowrap">Danh sách ({filteredEmployees.length})</CardTitle>
                        <div className="flex flex-1 md:justify-end gap-2 w-full md:w-auto">
                            <div className="w-full md:w-[200px]">
                                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                    <SelectTrigger>
                                        <div className="flex items-center text-muted-foreground">
                                            <Filter className="mr-2 h-4 w-4" />
                                            <SelectValue placeholder="Lọc phòng ban" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả phòng ban</SelectItem>
                                        {departments.map(dept => (
                                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Tìm theo tên nhân viên..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {employees.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <Upload className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900">Chưa có dữ liệu</h3>
                            <p className="text-slate-500 mt-1 max-w-sm mx-auto">Upload file Excel để bắt đầu quản lý.</p>
                            <Button onClick={triggerUpload} variant="link" className="mt-2 text-primary">Upload ngay</Button>
                        </div>
                    ) : (
                        <div className="max-h-[600px] overflow-y-auto relative border rounded-md shadow-sm bg-white">
                            <Table className="relative w-full">
                                <TableHeader className="sticky top-0 bg-slate-50 z-20 shadow-sm">
                                    <TableRow className="hover:bg-slate-50">
                                        <TableHead className="w-[50px] font-bold text-slate-700">STT</TableHead>
                                        <TableHead className="min-w-[100px] font-bold text-slate-700">Mã NV</TableHead>
                                        <TableHead className="min-w-[180px] font-bold text-slate-700">Họ và tên</TableHead>
                                        <TableHead className="min-w-[150px] font-bold text-slate-700">Phòng ban</TableHead>
                                        <TableHead className="min-w-[100px] font-bold text-slate-700">Khoa/Vị trí</TableHead>
                                        <TableHead className="min-w-[100px] font-bold text-slate-700">Role</TableHead>
                                        <TableHead className="min-w-[180px] font-bold text-slate-700">Email</TableHead>
                                        <TableHead className="text-right sticky right-0 bg-slate-50 z-30 w-[100px] font-bold text-slate-700">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEmployees.map((emp, index) => (
                                        <TableRow key={emp.id}>
                                            <TableCell className="text-slate-500 text-sm">{emp.order}</TableCell>
                                            <TableCell className="text-slate-700 font-mono text-xs">{emp.employeeCode || "---"}</TableCell>
                                            <TableCell className="font-medium text-sm text-slate-900">
                                                <div>{emp.fullName}</div>
                                                <div className="text-[10px] text-slate-400">{emp.jobTitle}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">{emp.department}</span>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">{emp.workLocation}</TableCell>
                                            <TableCell className="text-sm">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${emp.role === 'admin' ? 'bg-red-100 text-red-800' :
                                                    emp.role === 'director' ? 'bg-orange-100 text-orange-800' :
                                                        emp.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                                            emp.role === 'hr' ? 'bg-purple-100 text-purple-800' :
                                                                'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {emp.role.toUpperCase()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">{emp.email}</TableCell>
                                            <TableCell className="text-right sticky right-0 bg-white z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)]">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setEditingEmployee(emp)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingEmployeeId(emp.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <EmployeeEditDialog
                isOpen={!!editingEmployee}
                employee={editingEmployee}
                onClose={() => setEditingEmployee(null)}
                onSave={handleSaveEdit}
                departmentOptions={departments}
                locationOptions={workLocations}
                managerOptions={managerOptions}
            />

            <AlertDialog open={!!deletingEmployeeId} onOpenChange={(open) => !open && setDeletingEmployeeId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xoá nhân viên</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xoá nhân viên này? Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Huỷ bỏ</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Xoá</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
