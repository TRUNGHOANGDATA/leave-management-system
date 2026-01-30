"use client";

import { useApp, LeaveRequest, User } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function ApprovalPage() {
    const params = useParams(); // Use hook for client component
    const id = params?.id as string;
    const router = useRouter();
    const { settings, currentUser, updateLeaveRequestStatus, isLoaded } = useApp() as any; // Cast for isLoaded if missing in type definition

    const [request, setRequest] = useState<LeaveRequest | null>(null);
    const [requester, setRequester] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionTaken, setActionTaken] = useState<"approved" | "rejected" | null>(null);

    useEffect(() => {
        if (settings.leaveRequests.length > 0 && id) {
            const foundReq = settings.leaveRequests.find((r: LeaveRequest) => r.id === id);
            if (foundReq) {
                setRequest(foundReq);
                const user = settings.users.find((u: User) => u.id === foundReq.userId);
                setRequester(user || null);
            }
        }
    }, [settings.leaveRequests, settings.users, id]);

    const handleAction = async (status: "approved" | "rejected") => {
        if (!currentUser) return;
        setLoading(true);
        try {
            await updateLeaveRequestStatus(id, status, currentUser.name);
            setActionTaken(status);
        } catch (error) {
            console.error("Action error", error);
        } finally {
            setLoading(false);
        }
    };

    if (!request) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-slate-500">Đang tải thông tin đơn...</span>
            </div>
        );
    }

    // Auth Check: Is current user authorized?
    // Rules: Admin/Director can approve all. Manager can approve their own direct reports.
    const isAuthorized = currentUser && (
        ['admin', 'director'].includes(currentUser.role) ||
        (currentUser.role === 'manager' && requester?.managerId === currentUser.id)
    );

    if (actionTaken || request.status !== 'pending') {
        const status = actionTaken || request.status;
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4">
                            {status === 'approved' ? (
                                <CheckCircle className="w-16 h-16 text-green-500" />
                            ) : (
                                <XCircle className="w-16 h-16 text-red-500" />
                            )}
                        </div>
                        <CardTitle>
                            {status === 'approved' ? "Đã Duyệt Đơn" : status === 'rejected' ? "Đã Từ Chối" : "Đã Huỷ"}
                        </CardTitle>
                        <CardDescription>
                            Thao tác đã được ghi nhận vào hệ thống.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Button variant="outline" onClick={() => router.push('/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Về Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="max-w-md w-full shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl">Phê Duyệt Nghỉ Phép</CardTitle>
                            <CardDescription>Vui lòng xem xét đơn xin nghỉ dưới đây</CardDescription>
                        </div>
                        <Badge variant="outline">{requester?.department}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {requester?.name?.charAt(0) || "U"}
                        </div>
                        <div>
                            <p className="font-semibold">{requester?.name}</p>
                            <p className="text-sm text-slate-500">{requester?.email}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500">Loại nghỉ:</span>
                            <span className="font-medium">{request.type}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500">Thời gian:</span>
                            <span className="font-medium text-right">
                                {format(new Date(request.fromDate), "dd/MM/yyyy", { locale: vi })}
                                {" - "}
                                {format(new Date(request.toDate), "dd/MM/yyyy", { locale: vi })}
                                <br />
                                <span className="text-sm text-slate-400">
                                    ({request.duration} ngày)
                                </span>
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500">Lý do:</span>
                            <span className="font-medium text-right max-w-[200px]">{request.reason}</span>
                        </div>
                    </div>

                    {!currentUser ? (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm">
                            Vui lòng đăng nhập để thực hiện thao tác.
                            <Button variant="link" className="p-0 h-auto ml-1" onClick={() => router.push('/dashboard')}>Đăng nhập ngay</Button>
                        </div>
                    ) : !isAuthorized ? (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
                            Bạn không có quyền duyệt đơn này.
                        </div>
                    ) : null}

                </CardContent>
                <CardFooter className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => handleAction('rejected')}
                        disabled={loading || !isAuthorized}
                    >
                        TỪ CHỐI
                    </Button>
                    <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleAction('approved')}
                        disabled={loading || !isAuthorized}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        DUYỆT ĐƠN
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
