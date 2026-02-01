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
import { Loader2, Mail, Lock, User, CheckCircle2, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                title: "Mật khẩu không khớp",
                description: "Vui lòng kiểm tra lại mật khẩu xác nhận.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            // Sign up with Supabase Auth
            // Meta data 'name' includes the full name which our trigger will use
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name,
                    },
                },
            });

            if (error) {
                throw error;
            }

            toast({
                title: "Đăng ký thành công!",
                description: "Vui lòng đăng nhập để bắt đầu.",
                className: "bg-green-50 border-green-200 text-green-800"
            });

            // Redirect to login page
            router.push("/login");

        } catch (error: any) {
            console.error("Registration error:", error);
            toast({
                title: "Đăng ký thất bại",
                description: error.message || "Đã có lỗi xảy ra. Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"></div>

            <Card className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur-xl shadow-2xl border-white/20">
                <CardHeader className="space-y-1 text-center pb-2">
                    <div className="absolute left-6 top-6">
                        <Link href="/login" className="text-slate-400 hover:text-slate-600 transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </div>

                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <User className="h-7 w-7 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                        Tạo tài khoản mới
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        Tham gia hệ thống quản lý nhân sự chuyên nghiệp
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Họ và Tên</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="name"
                                    placeholder="Nguyễn Văn A"
                                    className="pl-9 bg-white/50 border-slate-200 focus:bg-white transition-all"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Mật khẩu</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="pl-9 bg-white/50 border-slate-200 focus:bg-white transition-all"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Xác nhận</Label>
                                <div className="relative">
                                    <CheckCircle2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        className="pl-9 bg-white/50 border-slate-200 focus:bg-white transition-all"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 h-10 font-medium text-base transition-all hover:scale-[1.02]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang tạo tài khoản...
                                </>
                            ) : (
                                "Đăng ký"
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-slate-100 pt-4 mt-2">
                    <div className="text-center text-sm text-slate-500">
                        Đã có tài khoản?{" "}
                        <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline">
                            Đăng nhập
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
