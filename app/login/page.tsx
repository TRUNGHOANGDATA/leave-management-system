"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

// Production URL - Change this if your domain changes
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://leave-management-system-self-mu.vercel.app";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            toast({
                title: "Đăng nhập thành công",
                description: "Đang chuyển hướng...",
            });

            router.refresh();
            router.push("/dashboard");
        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Đăng nhập thất bại",
                description: error.message || "Vui lòng kiểm tra lại thông tin.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = async () => {
        if (!email || !password) {
            toast({ variant: "destructive", title: "Thiếu thông tin", description: "Vui lòng nhập Email và Mật khẩu." });
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${SITE_URL}/auth/callback`,
                }
            });
            if (error) throw error;
            toast({ title: "Đăng ký thành công", description: "Vui lòng kiểm tra email để xác nhận (nếu cần)." });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Lỗi đăng ký", description: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            toast({ variant: "destructive", title: "Thiếu Email", description: "Vui lòng nhập Email để lấy lại mật khẩu." });
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${SITE_URL}/auth/reset-password`,
            });
            if (error) throw error;
            toast({
                title: "Email đã được gửi! 📧",
                description: "Kiểm tra hộp thư đến (hoặc spam) để đặt lại mật khẩu."
            });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Lỗi", description: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold text-primary">LeaveManager</CardTitle>
                    <CardDescription>Đăng nhập để quản lý nghỉ phép</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Mật khẩu</Label>
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    className="text-xs text-blue-600 hover:underline"
                                    disabled={isLoading}
                                >
                                    Quên mật khẩu?
                                </button>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Đăng nhập
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 border-t pt-4">
                    <p className="text-xs text-center text-slate-500">Chưa có tài khoản?</p>
                    <Button variant="outline" className="w-full" onClick={handleSignUp} disabled={isLoading}>
                        Đăng ký tài khoản mới
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
