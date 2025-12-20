import api from '@/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, MapPin } from "lucide-react";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

function EnrollmentExportPage() {
    const [year, setYear] = useState("2025");
    const [month, setMonth] = useState("ALL");

    // Lokasi & User
    const [user, setUser] = useState(null);
    const [states, setStates] = useState([]);
    const [ppds, setPpds] = useState([]);

    // Pilihan Filter
    const [selectedState, setSelectedState] = useState("ALL");
    const [selectedPPD, setSelectedPPD] = useState("ALL");

    const [exporting, setExporting] = useState(false);

    // 1. Load User & Initial Data
    useEffect(() => {
        const fetchInitData = async () => {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userData = JSON.parse(userStr);
                setUser(userData);
                const token = localStorage.getItem('authToken');

                // A. JIKA ADMIN: Tarik Semua Negeri
                if (userData.role === 'Admin') {
                    const res = await api.get('/enrollment/options/locations', { headers: { Authorization: `Bearer ${token}` } });
                    setStates(res.data.states || []);
                    // PPD akan diload bila state dipilih
                }
                // B. JIKA JPN: Tarik PPD Negeri Dia Sahaja
                else if (userData.role === 'Negeri') {
                    // State dah tetap, tarik PPD terus
                    const stateId = typeof userData.state === 'object' ? userData.state._id : userData.state;
                    if (stateId) {
                        const res = await api.get(`/ppds?state=${stateId}`, { headers: { Authorization: `Bearer ${token}` } });
                        setPpds(res.data);
                    }
                }
            }
        };
        fetchInitData();
    }, []);

    // 2. Logic Admin: Bila Negeri Berubah, Load PPD
    useEffect(() => {
        const loadAdminPPDs = async () => {
            if (user?.role === 'Admin' && selectedState !== "ALL") {
                const token = localStorage.getItem('authToken');
                const res = await api.get(`/ppds?state=${selectedState}`, { headers: { Authorization: `Bearer ${token}` } });
                setPpds(res.data);
                setSelectedPPD("ALL"); // Reset PPD bila tukar negeri
            } else if (user?.role === 'Admin' && selectedState === "ALL") {
                setPpds([]); // Kosongkan jika pilih semua negeri
            }
        };
        loadAdminPPDs();
    }, [selectedState, user]);

    // 3. Fungsi Export
    const handleExport = async () => {
        setExporting(true);
        try {
            const token = localStorage.getItem('authToken');

            // Bina Query Parameters
            const params = { year };
            if (month !== "ALL") params.month = month;

            // Filter PPD (JPN & Admin)
            if (selectedPPD !== "ALL") params.ppd = selectedPPD;

            // Filter State (Admin sahaja)
            if (user.role === 'Admin' && selectedState !== "ALL") params.state = selectedState;

            // Panggil API dengan responseType 'blob'
            const response = await api.get('/enrollment/export', {
                params,
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            // Download Logic
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const fileName = `Enrolmen_Data_${year}_${selectedPPD !== 'ALL' ? 'PPD' : 'Full'}.xlsx`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();

            Swal.fire("Selesai", "Data berjaya dimuat turun.", "success");

        } catch (error) {
            console.error("Export failed:", error);
            Swal.fire("Ralat", "Gagal memuat turun data atau tiada data.", "error");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Eksport Laporan Enrolmen</h1>
                <p className="text-muted-foreground">Muat turun data enrolmen mentah dalam format Excel.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        Tetapan Laporan
                    </CardTitle>
                    <CardDescription>Pilih kriteria data yang ingin dimuat turun.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tahun */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tahun Enrolmen</label>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2024">2024</SelectItem>
                                    <SelectItem value="2025">2025</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Bulan */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bulan</label>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger><SelectValue placeholder="Keseluruhan Tahun" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Keseluruhan Tahun</SelectItem>
                                    {[...Array(12)].map((_, i) => (
                                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                                            {new Date(0, i).toLocaleString('ms-MY', { month: 'long' })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* FILTER NEGERI (Hanya Admin Nampak) */}
                        {user?.role === 'Admin' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Negeri</label>
                                <Select value={selectedState} onValueChange={setSelectedState}>
                                    <SelectTrigger><SelectValue placeholder="Semua Negeri" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Negeri</SelectItem>
                                        {states.map(s => (
                                            <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* FILTER PPD (Admin & JPN Nampak) */}
                        {/* JPN sentiasa nampak. Admin nampak bila dah pilih negeri */}
                        {(user?.role === 'Negeri' || (user?.role === 'Admin' && selectedState !== 'ALL')) && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <MapPin className="h-3 w-3" /> PPD (Pilihan)
                                </label>
                                <Select value={selectedPPD} onValueChange={setSelectedPPD}>
                                    <SelectTrigger><SelectValue placeholder="Semua PPD" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua PPD</SelectItem>
                                        {ppds.map(p => (
                                            <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button
                            onClick={handleExport}
                            disabled={exporting}
                            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                        >
                            {exporting ? (
                                "Sedang Menjana..."
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Muat Turun Excel
                                </>
                            )}
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}

export default EnrollmentExportPage;