"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mail, ArrowLeft, KeyRound, Lock, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<"EMAIL" | "OTP">("EMAIL");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra");

            setStep("OTP");
            toast({
                title: "Đã gửi mã xác nhận!",
                description: "Vui lòng kiểm tra email của bạn.",
                className: "bg-green-50 border-green-200 text-green-800"
            });

        } catch (error: any) {
            toast({
                title: "Gửi thất bại",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast({
                title: "Mật khẩu không khớp",
                description: "Vui lòng nhập lại mật khẩu xác nhận.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra");

            toast({
                title: "Thành công!",
                description: "Mật khẩu đã được đặt lại. Đang chuyển hướng...",
                className: "bg-green-50 border-green-200 text-green-800"
            });

            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (error: any) {
            toast({
                title: "Đặt lại thất bại",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1497294815431-9365093b7331?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>

            <Card className="w-full max-w-md relative z-10 bg-white/90 backdrop-blur-md shadow-2xl border-white/20">
                <CardHeader className="space-y-1 text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <KeyRound className="h-7 w-7 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                        {step === "EMAIL" ? "Quên mật khẩu?" : "Đặt lại mật khẩu"}
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        {step === "EMAIL"
                            ? "Nhập email công việc để nhận mã xác nhận"
                            : `Nhập mã xác nhận đã gửi tới ${email}`
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    {step === "EMAIL" ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
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
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-900/20 h-10 font-medium text-base transition-all hover:scale-[1.02]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang gửi...
                                    </>
                                ) : (
                                    "Gửi mã xác nhận"
                                )}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="otp">Mã xác nhận (OTP)</Label>
                                <div className="relative">
                                    <CheckCircle2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="otp"
                                        type="text"
                                        placeholder="123456"
                                        className="pl-9 bg-white/50 border-slate-200 focus:bg-white transition-all tracking-widest font-mono text-lg"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        maxLength={6}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-9 bg-white/50 border-slate-200 focus:bg-white transition-all"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-9 bg-white/50 border-slate-200 focus:bg-white transition-all"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-green-600 hover:bg-green-700 shadow-lg h-10 font-medium text-base transition-all hover:scale-[1.02]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    "Đặt lại mật khẩu"
                                )}
                            </Button>
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setStep("EMAIL")}
                                    className="text-xs text-slate-500 hover:text-amber-600 underline"
                                >
                                    Gửi lại mã?
                                </button>
                            </div>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 pt-2 border-t border-slate-100 mt-4">
                    <div className="text-center text-sm text-slate-500">
                        <Link href="/login" className="text-blue-600 hover:text-blue-800 font-semibold hover:underline inline-flex items-center">
                            <ArrowLeft className="mr-1 h-3 w-3" /> Quay lại đăng nhập
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
