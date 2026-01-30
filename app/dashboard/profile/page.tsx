"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";

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
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex flex-col items-center gap-3">
                            <Avatar className="h-24 w-24 border-2 border-white shadow-md">
                                <AvatarImage src={formData.avatarUrl} alt={currentUser.name} />
                                <AvatarFallback className="text-2xl">{currentUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="w-full max-w-xs text-center">
                                <p className="text-xs text-slate-500 mb-2">
                                    Nhập URL ảnh từ dịch vụ lưu trữ (ImgBB, Cloudinary, Google Drive...)
                                </p>
                                <Input
                                    value={formData.avatarUrl}
                                    onChange={(e) => setFormData(prev => ({ ...prev, avatarUrl: e.target.value }))}
                                    className="h-9 text-sm"
                                    placeholder="https://example.com/avatar.jpg"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 flex-1 w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Họ và tên</Label>
                                    <Input
                                        id="fullName"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Số điện thoại</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="Chưa cập nhật"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code" className="text-slate-500">Mã nhân viên</Label>
                                    <Input id="code" value={currentUser.employeeCode || "---"} disabled className="bg-slate-50" />
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
