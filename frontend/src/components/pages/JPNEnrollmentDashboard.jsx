import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck2 } from "lucide-react"; // Icon
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

function JPNEnrollmentDashboard() {
    const [year, setYear] = useState("2025");
    const [month, setMonth] = useState("10");
    const [summaryData, setSummaryData] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Tarikh
    const [sessionDates, setSessionDates] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');

            // 1. Get Summary
            const resSummary = await api.get(`/enrollment/summary?year=${year}&month=${month}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummaryData(resSummary.data);

            // 2. Get Dates (Settings) - Tambahan Baru
            const resSettings = await api.get(`/enrollment/settings/${year}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resSettings.data) {
                setSessionDates(resSettings.data);
            } else {
                setSessionDates(null);
            }

        } catch (error) {
            console.error(error);
            Swal.fire("Ralat", "Gagal mendapatkan data.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [year, month]);

    const handleApprovePPD = async (ppdId, ppdName) => {
        // ... (kekal sama)
        const result = await Swal.fire({
            title: 'Sahkan PPD?',
            text: `Adakah anda pasti mahu meluluskan semua sekolah di ${ppdName}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Luluskan'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('authToken');
                await api.put(`/enrollment/approve-ppd/${ppdId}`, { year, month }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire("Berjaya", "Data PPD telah diluluskan.", "success");
                fetchData();
            } catch (error) {
                Swal.fire("Ralat", "Gagal meluluskan data.", "error");
            }
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Belum Diset';

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Enrolmen JPN</h1>
                    <p className="text-muted-foreground">Pantau status semakan PPD dan pengesahan enrolmen.</p>
                </div>
                <div className="flex gap-3">
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="3">Mac</SelectItem>
                            <SelectItem value="6">Jun</SelectItem>
                            <SelectItem value="10">Oktober</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={fetchData}>Refresh</Button>
                </div>
            </div>

            {/* INFO TARIKH (Permintaan 3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm">
                            <CalendarCheck2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tarikh Semakan PPD</p>
                            <p className="font-medium text-slate-700">
                                {sessionDates ? `${formatDate(sessionDates.verifyStartDate)} - ${formatDate(sessionDates.verifyEndDate)}` : "Belum ditetapkan"}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-white rounded-full text-green-600 shadow-sm">
                            <CalendarCheck2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Tarikh Pengesahan JPN</p>
                            <p className="font-medium text-slate-700">
                                {sessionDates ? `${formatDate(sessionDates.approveStartDate)} - ${formatDate(sessionDates.approveEndDate)}` : "Belum ditetapkan"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Status Pematuhan PPD</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama PPD</TableHead>
                                <TableHead className="text-center">Jum. Sekolah</TableHead>
                                <TableHead className="text-center">Disemak</TableHead>
                                <TableHead className="text-center">Progres</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Tindakan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8">Memuatkan data...</TableCell></TableRow>
                            ) : summaryData.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8">Tiada data.</TableCell></TableRow>
                            ) : (
                                summaryData.map((ppd) => (
                                    <TableRow key={ppd._id}>
                                        <TableCell className="font-medium">{ppd.ppdName}</TableCell>
                                        <TableCell className="text-center">{ppd.totalSchools}</TableCell>
                                        <TableCell className="text-center">{ppd.verifiedCount}</TableCell>
                                        <TableCell className="w-[200px]">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-600" style={{ width: `${ppd.progress}%` }} />
                                                </div>
                                                <span className="text-xs text-muted-foreground">{ppd.progress.toFixed(0)}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {ppd.approvedCount === ppd.totalSchools && ppd.totalSchools > 0 ? (
                                                <Badge className="bg-green-600">Selesai</Badge>
                                            ) : ppd.progress === 100 ? (
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Tunggu JPN</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-yellow-600 border-yellow-600">Dalam Proses</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant={ppd.progress === 100 && ppd.approvedCount < ppd.totalSchools ? "default" : "ghost"}
                                                disabled={ppd.progress < 100 || ppd.approvedCount === ppd.totalSchools}
                                                onClick={() => handleApprovePPD(ppd._id, ppd.ppdName)}
                                            >
                                                {ppd.approvedCount === ppd.totalSchools ? "Lulus" : "Sahkan"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default JPNEnrollmentDashboard;