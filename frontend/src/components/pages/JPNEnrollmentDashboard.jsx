import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, CalendarCheck2, Filter } from "lucide-react"; // Tambah Icon Activity
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

function JPNEnrollmentDashboard() {
    const [year, setYear] = useState("2025");
    const [month, setMonth] = useState("10");
    const [summaryData, setSummaryData] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Tarikh & Lokasi & Filter
    const [sessionDates, setSessionDates] = useState(null);
    const [statesList, setStatesList] = useState([]);
    const [selectedState, setSelectedState] = useState("");

    // ✅ BARU: Filter Status (Admin Sahaja)
    const [filterStatus, setFilterStatus] = useState("ALL");

    const [isAdmin, setIsAdmin] = useState(false);

    // 1. Check User Role & Init Data
    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                const role = (user.role || '').toLowerCase();

                if (role === 'admin') {
                    setIsAdmin(true);
                    api.get('/states', {
                        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                    }).then(res => setStatesList(res.data)).catch(console.error);
                } else {
                    const userStateId = user.state?._id || user.state || "";
                    setSelectedState(userStateId);
                }
            }
        } catch (e) {
            console.error("Error reading user role", e);
        }
    }, []);

    // 2. Fetch Data Dashboard
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            let targetStateId = "";

            if (isAdmin) {
                targetStateId = selectedState;
            } else {
                const userStr = localStorage.getItem('user');
                const user = JSON.parse(userStr || '{}');
                targetStateId = user.state?._id || user.state || "";
            }

            let url = `/enrollment/summary?year=${year}&month=${month}`;
            if (targetStateId && targetStateId !== "ALL") {
                url += `&state=${targetStateId}`;
            }

            const [resSummary, resSettings] = await Promise.all([
                api.get(url, { headers: { Authorization: `Bearer ${token}` } }),
                api.get(`/enrollment/settings/${year}`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setSummaryData(resSummary.data);
            setSessionDates(resSettings.data || null);

        } catch (error) {
            console.error(error);
            Swal.fire("Ralat", "Gagal mendapatkan data.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month, selectedState]);

    const handleApprovePPD = async (ppdId, ppdName) => {
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

    // ✅ LOGIK TAPISAN STATUS (Client-Side)
    const filteredData = summaryData.filter(ppd => {
        // Jika bukan admin, tunjuk semua (atau ikut keperluan JPN)
        if (!isAdmin) return true;

        // Jika filter "ALL", tunjuk semua
        if (filterStatus === "ALL") return true;

        // Logic Status
        const isCompleted = ppd.approvedCount === ppd.totalSchools && ppd.totalSchools > 0;
        const isPendingJPN = ppd.progress === 100 && ppd.approvedCount < ppd.totalSchools;

        if (filterStatus === "COMPLETED") return isCompleted;
        if (filterStatus === "PENDING_JPN") return isPendingJPN;
        if (filterStatus === "IN_PROGRESS") return !isCompleted && !isPendingJPN;

        return true;
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Enrolmen JPN</h1>
                    <p className="text-muted-foreground">Pantau status semakan PPD dan pengesahan enrolmen.</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto justify-end">

                    {/* ✅ FILTER ADMIN SAHAJA (Negeri & Status) */}
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border shadow-sm">
                            <Filter className="h-4 w-4 text-slate-500 ml-2" />

                            {/* 1. Filter Negeri */}
                            <Select value={selectedState} onValueChange={setSelectedState}>
                                <SelectTrigger className="w-[160px] border-none shadow-none bg-transparent focus:ring-0 h-8">
                                    <SelectValue placeholder="Pilih Negeri" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" disabled>-- Pilih Negeri --</SelectItem>
                                    {statesList.map(s => (
                                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

                            {/* 2. ✅ Filter Status (BARU) */}
                            <Activity className="h-4 w-4 text-slate-500 ml-1" />
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[140px] border-none shadow-none bg-transparent focus:ring-0 h-8">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Status</SelectItem>
                                    <SelectItem value="PENDING_JPN">Tunggu JPN</SelectItem>
                                    <SelectItem value="IN_PROGRESS">Dalam Proses</SelectItem>
                                    <SelectItem value="COMPLETED">Selesai</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="3">Mac</SelectItem>
                                <SelectItem value="6">Jun</SelectItem>
                                <SelectItem value="10">Oktober</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2025">2025</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={fetchData} variant="outline">Refresh</Button>
                    </div>
                </div>
            </div>

            {/* INFO TARIKH */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ... (Kad Info Tarikh kekal sama) ... */}
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm"><CalendarCheck2 className="h-6 w-6" /></div>
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tarikh Semakan PPD</p>
                            <p className="font-medium text-slate-700">{sessionDates ? `${formatDate(sessionDates.verifyStartDate)} - ${formatDate(sessionDates.verifyEndDate)}` : "Belum ditetapkan"}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-white rounded-full text-green-600 shadow-sm"><CalendarCheck2 className="h-6 w-6" /></div>
                        <div>
                            <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Tarikh Pengesahan JPN</p>
                            <p className="font-medium text-slate-700">{sessionDates ? `${formatDate(sessionDates.approveStartDate)} - ${formatDate(sessionDates.approveEndDate)}` : "Belum ditetapkan"}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        Status Pematuhan PPD
                        {isAdmin && selectedState === "" && <span className="text-sm font-normal text-muted-foreground ml-2">(Sila pilih negeri dahulu)</span>}
                    </CardTitle>
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
                            ) : filteredData.length === 0 ? ( // ✅ GUNA filteredData
                                <TableRow><TableCell colSpan={6} className="text-center py-8">
                                    {isAdmin && selectedState === ""
                                        ? "Sila pilih negeri di atas untuk melihat data."
                                        : "Tiada data ditemui mengikut kriteria tapisan."}
                                </TableCell></TableRow>
                            ) : (
                                filteredData.map((ppd) => ( // ✅ GUNA filteredData
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
                                                disabled={!isAdmin && (ppd.progress < 100 || ppd.approvedCount === ppd.totalSchools)}
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