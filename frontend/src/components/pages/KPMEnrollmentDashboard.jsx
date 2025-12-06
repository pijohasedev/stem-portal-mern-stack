import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2 } from "lucide-react"; // Ikon Bangunan (KPM)
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

function KPMEnrollmentDashboard() {
    const [year, setYear] = useState("2025");
    const [month, setMonth] = useState("10");
    const [kpmData, setKpmData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await api.get(`/enrollment/kpm-summary?year=${year}&month=${month}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKpmData(res.data);
        } catch (error) {
            console.error(error);
            Swal.fire("Ralat", "Gagal mendapatkan data KPM.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [year, month]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                        <Building2 className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard KPM</h1>
                        <p className="text-muted-foreground">Pemantauan status enrolmen peringkat nasional mengikut Negeri.</p>
                    </div>
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

            <Card>
                <CardHeader>
                    <CardTitle>Prestasi Mengikut Negeri</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[250px]">Negeri</TableHead>
                                <TableHead className="text-center">Verifikasi PPD</TableHead>
                                <TableHead className="text-center">Pengesahan JPN</TableHead>
                                <TableHead className="text-center">Progress Negeri</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8">Memuatkan data...</TableCell></TableRow>
                            ) : kpmData.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8">Tiada data untuk dipaparkan.</TableCell></TableRow>
                            ) : (
                                kpmData.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-bold text-base">{item.stateName}</TableCell>

                                        {/* Kolum Verifikasi PPD */}
                                        <TableCell className="text-center">
                                            <span className="font-mono font-medium">{item.ppdSelesai}</span> / <span className="text-muted-foreground">{item.totalPPDs}</span>
                                        </TableCell>

                                        {/* Kolum Pengesahan JPN */}
                                        <TableCell className="text-center">
                                            <span className="font-mono font-medium">{item.jpnSelesai}</span> / <span className="text-muted-foreground">{item.totalPPDs}</span>
                                        </TableCell>

                                        {/* Progress Bar */}
                                        <TableCell className="w-[300px]">
                                            <div className="flex items-center gap-3">
                                                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                    <div
                                                        className={`h-full transition-all ${item.progress === 100 ? 'bg-green-500' :
                                                                item.progress > 50 ? 'bg-blue-500' : 'bg-orange-500'
                                                            }`}
                                                        style={{ width: `${item.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium w-[40px] text-right">{item.progress.toFixed(0)}%</span>
                                            </div>
                                        </TableCell>

                                        {/* Status Badge */}
                                        <TableCell className="text-center">
                                            {item.jpnSelesai === item.totalPPDs && item.totalPPDs > 0 ? (
                                                <Badge className="bg-green-600 hover:bg-green-700">Selesai</Badge>
                                            ) : item.progress > 0 ? (
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Dalam Proses</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-500">Belum Mula</Badge>
                                            )}
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

export default KPMEnrollmentDashboard;