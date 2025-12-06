import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock, Save } from "lucide-react";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

function EnrollmentSettingsPage() {
    const [year, setYear] = useState("2025");
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        verifyStartDate: "",
        verifyEndDate: "",
        approveStartDate: "",
        approveEndDate: ""
    });

    const formatDateForInput = (dateString) => dateString ? new Date(dateString).toISOString().split('T')[0] : "";
    const formatDateForDisplay = (dateString) => dateString ? new Date(dateString).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' }) : "-";

    // Load Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await api.get(`/enrollment/settings/${year}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data) {
                    setFormData({
                        verifyStartDate: formatDateForInput(res.data.verifyStartDate),
                        verifyEndDate: formatDateForInput(res.data.verifyEndDate),
                        approveStartDate: formatDateForInput(res.data.approveStartDate),
                        approveEndDate: formatDateForInput(res.data.approveEndDate),
                    });
                } else {
                    setFormData({ verifyStartDate: "", verifyEndDate: "", approveStartDate: "", approveEndDate: "" });
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchSettings();
    }, [year]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            await api.post('/enrollment/settings', { year, ...formData }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire("Berjaya", "Tetapan sesi telah dikemaskini.", "success");
        } catch (error) {
            console.error(error);
            Swal.fire("Ralat", "Gagal menyimpan tetapan.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full text-purple-700">
                    <CalendarClock className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Kawalan Sesi Enrolmen</h1>
                    <p className="text-muted-foreground">Tetapkan tarikh buka dan tutup sistem bagi PPD dan JPN.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* KOLUM KIRI: BORANG TETAPAN */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Tetapan Tahun {year}</CardTitle>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2024">2024</SelectItem>
                                    <SelectItem value="2025">2025</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* FASA 1: PPD */}
                        <div className="space-y-4 border p-4 rounded-lg bg-blue-50/50 border-blue-100">
                            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                                <Badge className="bg-blue-600">1</Badge> Fasa Semakan PPD
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tarikh Mula</Label>
                                    <Input type="date" name="verifyStartDate" value={formData.verifyStartDate} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tarikh Tamat</Label>
                                    <Input type="date" name="verifyEndDate" value={formData.verifyEndDate} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        {/* FASA 2: JPN */}
                        <div className="space-y-4 border p-4 rounded-lg bg-green-50/50 border-green-100">
                            <h3 className="font-semibold text-green-800 flex items-center gap-2">
                                <Badge className="bg-green-600">2</Badge> Fasa Pengesahan JPN
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tarikh Mula</Label>
                                    <Input type="date" name="approveStartDate" value={formData.approveStartDate} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tarikh Tamat</Label>
                                    <Input type="date" name="approveEndDate" value={formData.approveEndDate} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button size="lg" onClick={handleSave} disabled={loading} className="gap-2">
                                <Save className="h-4 w-4" />
                                {loading ? "Menyimpan..." : "Simpan Perubahan"}
                            </Button>
                        </div>

                    </CardContent>
                </Card>

                {/* KOLUM KANAN: RINGKASAN STATUS (PERMINTAAN 2) */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Status Semasa</CardTitle>
                        <CardDescription>Jadual tarikh aktif sistem.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fasa</TableHead>
                                    <TableHead className="text-right">Tarikh</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium text-blue-700">Mula PPD</TableCell>
                                    <TableCell className="text-right">{formatDateForDisplay(formData.verifyStartDate)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium text-red-600">Tamat PPD</TableCell>
                                    <TableCell className="text-right font-bold">{formatDateForDisplay(formData.verifyEndDate)}</TableCell>
                                </TableRow>
                                <TableRow className="border-t-4 border-double">
                                    <TableCell className="font-medium text-green-700">Mula JPN</TableCell>
                                    <TableCell className="text-right">{formatDateForDisplay(formData.approveStartDate)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium text-red-600">Tamat JPN</TableCell>
                                    <TableCell className="text-right font-bold">{formatDateForDisplay(formData.approveEndDate)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>

                        <div className="mt-6 bg-yellow-50 p-3 rounded border border-yellow-200 text-xs text-yellow-800">
                            <p><strong>Nota Admin:</strong></p>
                            <p>Anda boleh memantau kemajuan (progress) PPD dan JPN melalui menu <u>Dashboard KPM</u>.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default EnrollmentSettingsPage;