"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mail, ArrowLeft, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const { toast } = useToast();

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${siteUrl}/reset-password`,
            });

            if (error) {
                throw error;
            }

            setIsSent(true);
            toast({
                title: "Email đã được gửi!",
                description: "Vui lòng kiểm tra hộp thư để đặt lại mật khẩu.",
                className: "bg-green-50 border-green-200 text-green-800"
            });

        } catch (error: any) {
            toast({
                title: "Gửi email thất bại",
                description: error.message || "Vui lòng kiểm tra lại email.",
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
                        {isSent ? "Kiểm tra email" : "Quên mật khẩu?"}
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        {isSent
                            ? "Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn."
                            : "Nhập email để nhận hướng dẫn đặt lại mật khẩu"
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    {isSent ? (
                        <div className="text-center py-4">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <Mail className="h-8 w-8 text-green-600" />
                            </div>
                            <p className="text-sm text-slate-600">
                                Đã gửi email đến <strong>{email}</strong>
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                                Không nhận được? Kiểm tra mục Spam hoặc thử lại sau 1 phút.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-4">
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
                                    "Gửi hướng dẫn"
                                )}
                            </Button>
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
