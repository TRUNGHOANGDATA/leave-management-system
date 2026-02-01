"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        console.log("Starting login for:", email);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            console.log("Login result:", { data, error });

            if (error) {
                throw error;
            }

            toast({
                title: "Đăng nhập thành công!",
                description: "Đang chuyển hướng vào hệ thống...",
                className: "bg-green-50 border-green-200 text-green-800"
            });

            // IMPORTANT: Don't set isLoading(false) here, or the spinner stops before redirect
            // Let the redirect happen while the spinner is still showing for better UX

            console.log("Redirecting to dashboard...");
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 500);

        } catch (error: any) {
            console.error("Login error:", error);
            toast({
                title: "Đăng nhập thất bại",
                description: error.message || "Vui lòng kiểm tra lại thông tin.",
                variant: "destructive",
            });
            setIsLoading(false); // Only stop loading on error
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1497294815431-9365093b7331?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>

            <Card className="w-full max-w-md relative z-10 bg-white/90 backdrop-blur-md shadow-2xl border-white/20">
                <CardHeader className="space-y-1 text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                            <ShieldCheck className="h-7 w-7 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                        Chào mừng trở lại
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        Hệ thống Quản lý nghỉ phép toàn diện
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email công việc</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    className="pl-9 bg-white/50 border-slate-200 focus:bg-white transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Mật khẩu</Label>
                                <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline">
                                    Quên mật khẩu?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    className="pl-9 bg-white/50 border-slate-200 focus:bg-white transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20 h-10 font-medium text-base transition-all hover:scale-[1.02]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                "Đăng nhập hệ thống"
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 pt-2 border-t border-slate-100 mt-4">
                    <div className="text-center text-sm text-slate-500">
                        Chưa có tài khoản?{" "}
                        <Link href="/register" className="text-blue-600 hover:text-blue-800 font-semibold hover:underline inline-flex items-center">
                            Đăng ký ngay <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
