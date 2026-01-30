"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [initError, setInitError] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    // Extract access token from URL hash on component mount
    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
            const params = new URLSearchParams(hash.replace("#", "?"));
            const token = params.get("access_token");
            if (token) {
                setAccessToken(token);
                // Clear the hash from URL for cleaner look
                window.history.replaceState(null, '', window.location.pathname);
            } else {
                setInitError("Không tìm thấy token trong link. Vui lòng yêu cầu link mới.");
            }
        } else {
            setInitError("Link không hợp lệ. Vui lòng yêu cầu link đổi mật khẩu mới.");
        }
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!accessToken) {
            toast({ variant: "destructive", title: "Lỗi", description: "Không có token xác thực." });
            return;
        }

        if (password !== confirmPassword) {
            toast({ variant: "destructive", title: "Lỗi", description: "Mật khẩu xác nhận không khớp." });
            return;
        }

        if (password.length < 6) {
            toast({ variant: "destructive", title: "Lỗi", description: "Mật khẩu phải có ít nhất 6 ký tự." });
            return;
        }

        setIsLoading(true);
        try {
            // Call server-side API to update password
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: accessToken,
                    new_password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Đã có lỗi xảy ra');
            }

            toast({ title: "Đổi mật khẩu thành công! ✅", description: "Đang chuyển về trang đăng nhập..." });

            await new Promise(resolve => setTimeout(resolve, 1500));
            router.push("/login?message=PasswordUpdated");
        } catch (err: any) {
            console.error("Reset Password Error:", err);
            toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể cập nhật mật khẩu." });
        } finally {
            setIsLoading(false);
        }
    };

    // Show error state if initialization failed
    if (initError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="space-y-1 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-2" />
                        <CardTitle className="text-2xl font-bold text-red-600">Lỗi</CardTitle>
                        <CardDescription className="text-red-500">{initError}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" onClick={() => router.push("/login")}>
                            Quay về trang đăng nhập
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show loading state while extracting token
    if (!accessToken) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="space-y-1 text-center">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-2" />
                        <CardTitle className="text-xl">Đang xử lý...</CardTitle>
                        <CardDescription>Vui lòng đợi trong giây lát</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <KeyRound className="mx-auto h-10 w-10 text-primary mb-2" />
                    <CardTitle className="text-2xl font-bold text-primary">Đặt lại mật khẩu</CardTitle>
                    <CardDescription>Nhập mật khẩu mới cho tài khoản của bạn</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Mật khẩu mới</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Lưu mật khẩu mới
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
