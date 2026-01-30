"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    // Listen for password recovery event
    useEffect(() => {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                // User clicked the reset link, they are now in a special session
                console.log("Password recovery mode active");
            }
        });
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

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
            // Check session
            let { data: { session } } = await supabase.auth.getSession();

            // Fallback: If no session but hash exists (URL from email), try to set session manually
            if (!session && window.location.hash && window.location.hash.includes("access_token")) {
                console.log("Attempting to parse session from URL hash...");
                const { data: { session: urlSession }, error: urlError } = await supabase.auth.getSession();
                if (urlSession) session = urlSession;
            }

            if (!session) {
                throw new Error("Không tìm thấy phiên đăng nhập. Hãy thử tải lại trang hoặc yêu cầu link mới.");
            }

            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            toast({ title: "Đổi mật khẩu thành công! ✅", description: "Đang chuyển về trang đăng nhập..." });

            await supabase.auth.signOut();
            setTimeout(() => router.push("/login"), 2000);
        } catch (err: any) {
            console.error("Reset Password Error:", err);
            toast({ variant: "destructive", title: "Lỗi", description: err.message || "Đã có lỗi xảy ra." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1 text-center">
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
