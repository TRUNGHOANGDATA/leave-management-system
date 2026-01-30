"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function ProfilePage() {
    const { currentUser, updateUser } = useApp();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        avatarUrl: ""
    });

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name || "",
                phone: currentUser.phone || "",
                email: currentUser.email || "",
                avatarUrl: currentUser.avatarUrl || ""
            });
        }
    }, [currentUser]);

    const handleSave = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            await updateUser({
                id: currentUser.id,
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                avatarUrl: formData.avatarUrl
            });
            toast({ title: "Cập nhật thành công", description: "Thông tin cá nhân đã được lưu." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Lỗi", description: "Không thể cập nhật thông tin." });
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) return <div className="p-8 text-center text-slate-500">Loading profile...</div>;

    return (
        <div className="container max-w-3xl py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Thông tin cá nhân</h1>
                <p className="text-slate-500">Xem và cập nhật thông tin hồ sơ của bạn.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Thông tin cơ bản</CardTitle>
                    <CardDescription>Thông tin hiển thị trên hệ thống.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex flex-col items-center gap-2 pt-2">
                            <Avatar className="h-20 w-20 border-2 border-slate-100 shadow-sm">
                                <AvatarImage src={formData.avatarUrl} alt={currentUser.name} />
                                <AvatarFallback className="text-xl bg-slate-100 text-slate-500">{currentUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>

                            <div className="flex flex-col items-center">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2">
                                            Đổi ảnh
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-3" side="bottom" align="center">
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-xs leading-none">URL Ảnh đại diện</h4>
                                            <p className="text-[10px] text-muted-foreground">
                                                Dùng link ảnh từ ImgBB, Cloudinary, Drive...
                                            </p>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={formData.avatarUrl}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, avatarUrl: e.target.value }))}
                                                    className="h-8 text-xs"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="grid gap-5 flex-1 w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="text-sm font-medium">Họ và tên</Label>
                                    <Input
                                        id="fullName"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                                    <Input
                                        id="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="bg-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-sm font-medium">Số điện thoại</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="Chưa cập nhật"
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code" className="text-sm font-medium text-slate-500">Mã nhân viên</Label>
                                    <Input id="code" value={currentUser.employeeCode || "---"} disabled className="bg-slate-50 text-slate-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Công việc & Chức vụ</CardTitle>
                    <CardDescription>Thông tin này được quản lý bởi Admin/HR.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-slate-500">Phòng ban</Label>
                        <div className="font-medium p-2 bg-slate-50 rounded border">{currentUser.department}</div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-500">Vị trí / Khoa</Label>
                        <div className="font-medium p-2 bg-slate-50 rounded border">{currentUser.workLocation || "---"}</div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-500">Chức danh</Label>
                        <div className="font-medium p-2 bg-slate-50 rounded border">{currentUser.jobTitle || "---"}</div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-500">Vai trò hệ thống</Label>
                        <div className="flex items-center p-2 bg-slate-50 rounded border">
                            <span className="capitalize font-semibold text-blue-600">{currentUser.role}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading} className="w-32">
                    {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
            </div>
        </div>
    );
}
