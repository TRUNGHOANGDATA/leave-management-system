"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Database } from "@/lib/database.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, Save } from "lucide-react";

type EmailTemplate = Database['public']['Tables']['email_templates']['Row'];

export function EmailSettings() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        setFetchError(null);

        const { data, error } = await supabase.from('email_templates').select('*').order('name');

        if (error) {
            console.error("Error fetching templates:", error);
            setFetchError(error.message);
        } else if (data) {
            setTemplates(data);
            if (data.length > 0 && !selectedTemplate) {
                setSelectedTemplate(data[0]);
            }
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!selectedTemplate) return;
        setIsSaving(true);
        setStatusMessage(null);

        const { error } = await supabase
            .from('email_templates')
            .update({
                subject: selectedTemplate.subject,
                body_html: selectedTemplate.body_html
            })
            .eq('id', selectedTemplate.id);

        setIsSaving(false);
        if (error) {
            setStatusMessage("Lỗi khi lưu: " + error.message);
        } else {
            setStatusMessage("Đã lưu thành công!");
            setTimeout(() => setStatusMessage(null), 3000);

            // Update local list
            setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? selectedTemplate : t));
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar List */}
            <div className="lg:col-span-1 space-y-2">
                <h3 className="font-semibold text-slate-900 mb-4 px-2">Danh sách mẫu Email</h3>
                {fetchError && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded mb-2">
                        Lỗi: {fetchError}
                    </div>
                )}
                {templates.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedTemplate?.id === t.id
                            ? "bg-slate-100 text-blue-600 font-medium"
                            : "text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        {t.name}
                    </button>
                ))}
            </div>

            {/* Editor Area */}
            <div className="lg:col-span-3">
                {selectedTemplate ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>{selectedTemplate.name}</CardTitle>
                            <CardDescription>
                                {selectedTemplate.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="subject">Tiêu đề Email</Label>
                                <Input
                                    id="subject"
                                    value={selectedTemplate.subject}
                                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="body">Nội dung HTML</Label>
                                    <div className="text-xs text-slate-500">
                                        Biến có sẵn: {Array.isArray(selectedTemplate.variables) ? (selectedTemplate.variables as string[]).map(v => `{{${v}}}`).join(", ") : ""}
                                    </div>
                                </div>
                                <Textarea
                                    id="body"
                                    rows={15}
                                    className="font-mono text-sm"
                                    value={selectedTemplate.body_html}
                                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body_html: e.target.value })}
                                />
                                <p className="text-xs text-slate-500">
                                    Hỗ trợ HTML cơ bản. Nội dung sẽ được bao bọc bởi template chung của hệ thống logic.
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <span className={`text-sm ${statusMessage?.includes("Lỗi") ? "text-red-500" : "text-green-600"}`}>
                                    {statusMessage}
                                </span>
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 border rounded-lg bg-slate-50 p-8 border-dashed">
                        Chọn một mẫu email để chỉnh sửa
                    </div>
                )}
            </div>
        </div>
    );
}
