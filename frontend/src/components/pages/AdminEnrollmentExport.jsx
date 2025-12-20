import api from '@/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Download, FileSpreadsheet } from "lucide-react";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
// ❌ import * as XLSX from 'xlsx'; // TIDAK DIPERLUKAN LAGI

function AdminEnrollmentExport() {
    const [year, setYear] = useState("2025");
    const [month, setMonth] = useState("10");

    const [scope, setScope] = useState("ALL"); // ALL, STATE, PPD
    const [selectedId, setSelectedId] = useState(""); // ID Negeri atau PPD
    const [openPpd, setOpenPpd] = useState(false);

    const [locations, setLocations] = useState({ states: [], ppds: [] });
    const [loading, setLoading] = useState(false);

    // 1. Load Senarai Negeri & PPD
    useEffect(() => {
        api.get('/enrollment/options/locations', {
            headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        }).then(res => {
            setLocations(res.data);
        }).catch(err => console.error(err));
    }, []);

    // 2. Fungsi Generate Excel (Backend Generates, Frontend Downloads)
    const handleDownload = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');

            // Susun parameter ikut kehendak Backend
            // Backend nak: ?year=...&month=...&state=... ATAU &ppd=...
            const params = { year, month };

            if (scope === 'STATE' && selectedId) {
                params.state = selectedId;
            } else if (scope === 'PPD' && selectedId) {
                params.ppd = selectedId;
            }

            // Panggil API dengan Blob
            const res = await api.get('/enrollment/export', {
                params,
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob' // ✅ WAJIB: Terima fail binary
            });

            // Proses Download
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;

            // Nama Fail
            const scopeName = scope === 'ALL' ? 'Nasional' : (scope === 'STATE' ? 'Negeri' : 'PPD');
            const fileName = `Laporan_Enrolmen_${year}_${month}_${scopeName}.xlsx`;

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            Swal.fire("Selesai", "Laporan berjaya dimuat turun.", "success");

        } catch (error) {
            console.error("Export error:", error);
            // Jika Blob error, kadang susah nak baca message JSON, so guna generic message
            Swal.fire("Ralat", "Gagal memuat turun data atau tiada rekod.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full text-green-700">
                    <FileSpreadsheet className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Eksport Data Enrolmen</h1>
                    <p className="text-muted-foreground">Muat turun data enrolmen yang telah disahkan dalam format Excel.</p>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>Tetapan Laporan</CardTitle></CardHeader>
                <CardContent className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pilih Tahun & Bulan */}
                        <div className="space-y-2">
                            <Label>Tahun</Label>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2024">2024</SelectItem>
                                    <SelectItem value="2025">2025</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Bulan</Label>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
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

                        {/* Pilih Skop (Negeri/PPD) */}
                        <div className="space-y-2">
                            <Label>Peringkat Laporan</Label>
                            <Select value={scope} onValueChange={(v) => { setScope(v); setSelectedId(""); }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Data (Seluruh Negara)</SelectItem>
                                    <SelectItem value="STATE">Ikut Negeri</SelectItem>
                                    <SelectItem value="PPD">Ikut PPD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dropdown Dinamik: Pilih Negeri */}
                        {scope === 'STATE' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Pilih Negeri</Label>
                                <Select value={selectedId} onValueChange={setSelectedId}>
                                    <SelectTrigger><SelectValue placeholder="Sila pilih negeri..." /></SelectTrigger>
                                    <SelectContent>
                                        {locations.states.map(s => (
                                            <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* COMBOBOX CARIAN UNTUK PPD */}
                        {scope === 'PPD' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Pilih PPD</Label>
                                <Popover open={openPpd} onOpenChange={setOpenPpd}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openPpd}
                                            className="w-full justify-between"
                                        >
                                            {selectedId
                                                ? locations.ppds.find((p) => p._id === selectedId)?.name
                                                : "Cari dan pilih PPD..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Taip nama PPD..." />
                                            <CommandList>
                                                <CommandEmpty>Tiada PPD dijumpai.</CommandEmpty>
                                                <CommandGroup>
                                                    {locations.ppds.map((p) => (
                                                        <CommandItem
                                                            key={p._id}
                                                            value={p.name}
                                                            onSelect={() => {
                                                                setSelectedId(p._id);
                                                                setOpenPpd(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedId === p._id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {p.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                        <Button
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 gap-2"
                            onClick={handleDownload}
                            disabled={loading || (scope !== 'ALL' && !selectedId)}
                        >
                            {loading ? (
                                "Sedang Menjana..."
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
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

export default AdminEnrollmentExport;