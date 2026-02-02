"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import { DEPARTMENTS } from "@/lib/constants";
import { Pencil, Loader2, UserCog } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function UpdateProfileDialog() {
    const { currentUser, settings, updateUser } = useApp();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form Stats
    const [name, setName] = useState("");
    const [department, setDepartment] = useState("");
    const [managerId, setManagerId] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [phone, setPhone] = useState("");

    // Initialize form when opening
    useEffect(() => {
        if (currentUser && open) {
            setName(currentUser.name || "");
            setDepartment(currentUser.department || "");
            setManagerId(currentUser.managerId || "");
            setJobTitle(currentUser.jobTitle || "");
            setPhone(currentUser.phone || "");
        }
    }, [currentUser, open]);

    // Filter potential managers (Anyone with role manager, director, or admin)
    // Exclude self to prevent circular reporting
    const potentialManagers = settings.users?.filter(u =>
        (u.role === 'manager' || u.role === 'director' || u.role === 'admin') &&
        u.id !== currentUser?.id
    ) || [];

    const handleSave = async () => {
        if (!currentUser) return;
        setIsSaving(true);

        try {
            await updateUser({
                id: currentUser.id,
                name,
                department,
                managerId: managerId === "none" ? undefined : managerId,
                jobTitle,
                phone
            });

            toast({
                title: "Cập nhật thành công",
                description: "Thông tin hồ sơ của bạn đã được lưu.",
                variant: "default",
                className: "bg-green-50 border-green-200 text-green-800"
            });
            setOpen(false);
        } catch (error) {
            toast({
                title: "Lỗi cập nhật",
                description: "Không thể lưu thông tin. Vui lòng thử lại.",
                variant: "destructive"
            });
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-slate-600 border-slate-200 hover:bg-slate-50">
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only">Cập nhật</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-blue-600" />
                        Cập nhật hồ sơ
                    </DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin cá nhân, phòng ban và người quản lý trực tiếp của bạn.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Name */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right text-slate-500">
                            Họ và tên
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    {/* Department */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="department" className="text-right text-slate-500">
                            Phòng ban
                        </Label>
                        <Select value={department} onValueChange={setDepartment}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Chọn phòng ban" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {DEPARTMENTS.map((dept) => (
                                    <SelectItem key={dept} value={dept}>
                                        {dept}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Manager */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="manager" className="text-right text-slate-500">
                            Quản lý
                        </Label>
                        <Select value={managerId} onValueChange={setManagerId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Chọn người quản lý trực tiếp" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                <SelectItem value="none">-- Không có / Tự quản lý --</SelectItem>
                                {potentialManagers.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name} ({m.department})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Job Title */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="jobTitle" className="text-right text-slate-500">
                            Chức danh
                        </Label>
                        <Input
                            id="jobTitle"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className="col-span-3"
                            placeholder="VD: Senior Developer"
                        />
                    </div>

                    {/* Phone */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right text-slate-500">
                            Số điện thoại
                        </Label>
                        <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="col-span-3"
                            placeholder="0912345678"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Huỷ</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang lưu...
                            </>
                        ) : (
                            "Lưu thay đổi"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
