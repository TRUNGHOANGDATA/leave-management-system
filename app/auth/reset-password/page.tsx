"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    // Initialize session from URL hash on component mount
    useEffect(() => {
        const initSession = async () => {
            try {
                // First, check if session already exists
                let { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    console.log("Session already exists");
                    setSessionReady(true);
                    return;
                }

                // If no session, try to parse from hash
                const hash = window.location.hash;
                if (hash && hash.includes("access_token")) {
                    console.log("Parsing session from URL hash...");
                    const params = new URLSearchParams(hash.replace("#", "?"));
                    const access_token = params.get("access_token");
                    const refresh_token = params.get("refresh_token");

                    if (access_token && refresh_token) {
                        const { data, error } = await supabase.auth.setSession({
                            access_token,
                            refresh_token
                        });

                        if (error) {
                            console.error("setSession error:", error);
                            setInitError("Không thể khôi phục phiên đăng nhập. Link có thể đã hết hạn.");
                            return;
                        }

                        if (data.session) {
                            console.log("Session set successfully from hash");
                            setSessionReady(true);
                            // Clear the hash from URL for cleaner look
                            window.history.replaceState(null, '', window.location.pathname);
                            return;
                        }
                    }
                }

                setInitError("Không tìm thấy thông tin đăng nhập. Vui lòng yêu cầu link đổi mật khẩu mới.");
            } catch (err: any) {
                console.error("Init session error:", err);
                setInitError(err.message || "Lỗi khởi tạo phiên đăng nhập");
            }
        };

        initSession();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!sessionReady) {
            toast({ variant: "destructive", title: "Lỗi", description: "Phiên đăng nhập chưa sẵn sàng. Vui lòng tải lại trang." });
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
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            toast({ title: "Đổi mật khẩu thành công! ✅", description: "Đang chuyển về trang đăng nhập..." });

            await new Promise(resolve => setTimeout(resolve, 1000));
            await supabase.auth.signOut();
            router.push("/login?message=PasswordUpdated");
        } catch (err: any) {
            console.error("Reset Password Error:", err);
            let msg = err.message;
            if (msg.includes("different from the old")) {
                msg = "Mật khẩu mới phải khác mật khẩu cũ.";
            }
            toast({ variant: "destructive", title: "Lỗi", description: msg || "Không thể cập nhật mật khẩu." });
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

    // Show loading state while initializing session
    if (!sessionReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="space-y-1 text-center">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-2" />
                        <CardTitle className="text-xl">Đang khởi tạo...</CardTitle>
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
                    <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
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
