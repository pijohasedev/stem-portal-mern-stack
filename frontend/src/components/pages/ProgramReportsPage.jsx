import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileSpreadsheet, MapPin, PlusCircle, Target } from "lucide-react";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

// --- IMPORTS PETA ---
import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

// Fix ikon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

function SearchField({ onLocationFound }) {
    const map = useMap();
    useEffect(() => {
        const provider = new OpenStreetMapProvider();
        const searchControl = new GeoSearchControl({ provider, style: 'bar', showMarker: true, autoClose: true, keepResult: true });
        map.addControl(searchControl);
        map.on('geosearch/showlocation', (result) => {
            if (result?.location) onLocationFound({ lat: result.location.y, lng: result.location.x, label: result.location.label });
        });
        return () => map.removeControl(searchControl);
    }, [map, onLocationFound]);
    return null;
}

function LocationPicker({ position, setPosition }) {
    useMapEvents({ click(e) { setPosition(e.latlng); }, });
    return position ? <Marker position={position} /> : null;
}

function ProgramReportsPage() {
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterLevel, setFilterLevel] = useState("ALL");

    const [terasList, setTerasList] = useState([]);
    const [strategyList, setStrategyList] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportDates, setExportDates] = useState({ start: "", end: "" });
    const [exporting, setExporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // ✅ BONUS: Loading state

    const targetOptions = ["Murid", "Guru", "Ibu Bapa", "Komuniti", "PPD", "JPN", "Industri"];
    const levelOptions = ["Sekolah", "PPD", "Negeri/JPN", "Kebangsaan", "Antarabangsa", "Zon Utara", "Zon Selatan", "Zon Timur", "Zon Tengah", "Zon Sabah", "Zon Sarawak"];

    const [formData, setFormData] = useState({
        teras: "",
        strategy: "",
        title: "", venue: "", dateStart: "", dateEnd: "", participantCount: 0,
        description: "", organizerName: "", programLevel: "Sekolah",
        targetGroups: [], lat: 3.1412, lng: 101.6865
    });

    // ID POLISI STEM
    const STEM_POLICY_ID = "690afaa7f1255ad854c7be11";

    useEffect(() => {
        const initData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const resTeras = await api.get(`/teras?policy=${STEM_POLICY_ID}`, { headers: { Authorization: `Bearer ${token}` } });
                setTerasList(resTeras.data);

                const resStrat = await api.get('/strategies', { headers: { Authorization: `Bearer ${token}` } });
                setStrategyList(resStrat.data);
            } catch (err) { console.error("Gagal muat data dasar:", err); }
        };
        initData();
    }, []);

    const fetchPrograms = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await api.get(`/programs?level=${filterLevel}`, { headers: { Authorization: `Bearer ${token}` } });
            setPrograms(res.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchPrograms(); }, [filterLevel]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleTargetCheck = (target, isChecked) => {
        setFormData(prev => {
            let newTargets = [...prev.targetGroups];
            if (isChecked) {
                if (!newTargets.find(t => t.group === target)) newTargets.push({ group: target, count: 0 });
            } else {
                newTargets = newTargets.filter(t => t.group !== target);
            }
            const total = newTargets.reduce((sum, item) => sum + Number(item.count), 0);
            return { ...prev, targetGroups: newTargets, participantCount: total };
        });
    };

    const handleTargetCountChange = (target, count) => {
        setFormData(prev => {
            const newTargets = prev.targetGroups.map(t => t.group === target ? { ...t, count: Number(count) } : t);
            const total = newTargets.reduce((sum, item) => sum + Number(item.count), 0);
            return { ...prev, targetGroups: newTargets, participantCount: total };
        });
    };

    const handleSearchLocation = (result) => {
        setFormData(prev => ({ ...prev, lat: result.lat, lng: result.lng, venue: prev.venue || result.label }));
    };

    // ✅ UPDATED: Handle Submit dengan Modal Close + Alert + Reopen
    const handleSubmit = async () => {
        // Validate all required fields
        const missingFields = [];
        if (!formData.teras) missingFields.push("Teras");
        if (!formData.title) missingFields.push("Tajuk Program");
        if (!formData.dateStart) missingFields.push("Tarikh Mula");
        if (!formData.venue) missingFields.push("Lokasi/Venue");
        if (!formData.organizerName) missingFields.push("Penganjur");
        if (!formData.programLevel) missingFields.push("Peringkat");
        if (formData.targetGroups.length === 0) missingFields.push("Peserta (Pilih sekurang-kurangnya satu)");

        if (missingFields.length > 0) {
            setIsModalOpen(false);

            setTimeout(() => {
                Swal.fire({
                    title: "Medan Wajib",
                    html: `Sila lengkapkan medan berikut:<br/><br/><strong>${missingFields.join("<br/>")}</strong>`,
                    icon: "warning",
                    confirmButtonText: "OK",
                    confirmButtonColor: "#2563eb"
                }).then(() => {
                    setIsModalOpen(true); // Buka balik modal
                });
            }, 100);
            return;
        }

        setIsSaving(true);

        try {
            const token = localStorage.getItem('authToken');
            const payload = { ...formData, location: { lat: formData.lat, lng: formData.lng } };
            await api.post('/programs', payload, { headers: { Authorization: `Bearer ${token}` } });

            setIsModalOpen(false);
            setIsSaving(false);

            // Reset form
            setFormData({
                teras: "", strategy: "",
                title: "", venue: "", dateStart: "", dateEnd: "", participantCount: 0,
                description: "", organizerName: "",
                programLevel: "Sekolah", targetGroups: [], lat: 3.1412, lng: 101.6865
            });

            fetchPrograms();

            setTimeout(() => {
                Swal.fire({
                    title: "Berjaya!",
                    text: "Laporan aktiviti telah direkodkan.",
                    icon: "success",
                    confirmButtonText: "OK",
                    confirmButtonColor: "#16a34a"
                });
            }, 100);

        } catch (error) {
            console.error(error);
            setIsSaving(false);
            setIsModalOpen(false);

            setTimeout(() => {
                Swal.fire({
                    title: "Ralat",
                    text: "Gagal menyimpan laporan. Sila cuba lagi.",
                    icon: "error",
                    confirmButtonText: "OK",
                    confirmButtonColor: "#dc2626"
                }).then(() => {
                    setIsModalOpen(true); // Buka balik modal
                });
            }, 100);
        }
    };

    // ✅ UPDATED: Handle Export dengan Modal Close + Alert
    const handleExport = async () => {
        if (!exportDates.start || !exportDates.end) {
            setIsExportModalOpen(false);

            setTimeout(() => {
                Swal.fire({
                    title: "Ralat",
                    text: "Sila pilih tarikh mula dan tamat.",
                    icon: "warning",
                    confirmButtonText: "OK",
                    confirmButtonColor: "#2563eb"
                }).then(() => {
                    setIsExportModalOpen(true); // Buka balik modal
                });
            }, 100);
            return;
        }

        setExporting(true);

        try {
            const token = localStorage.getItem('authToken');
            const res = await api.get('/programs/export', {
                params: { startDate: exportDates.start, endDate: exportDates.end },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data;

            if (data.length === 0) {
                setExporting(false);
                setIsExportModalOpen(false);

                setTimeout(() => {
                    Swal.fire({
                        title: "Tiada Data",
                        text: "Tiada aktiviti dijumpai dalam julat tarikh ini.",
                        icon: "info",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#2563eb"
                    }).then(() => {
                        setIsExportModalOpen(true); // Buka balik modal
                    });
                }, 100);
                return;
            }

            const excelRows = data.map((p, i) => {
                const targetStr = p.targetGroups.map(t => `${t.group} (${t.count})`).join(", ");
                const terasStr = p.teras
                    ? `${p.teras.code ? p.teras.code + ': ' : ''}${p.teras.name}`
                    : "-";

                const strategyStr = p.strategy
                    ? `${p.strategy.code ? p.strategy.code + ': ' : ''}${p.strategy.name}`
                    : "-";

                return {
                    "Bil": i + 1,
                    "Teras": terasStr,
                    "Strategi": strategyStr,
                    "Tajuk Program": p.title,
                    "Peringkat": p.programLevel,
                    "Penganjur": p.organizerName || "-",
                    "Tarikh Mula": new Date(p.dateStart).toLocaleDateString('en-GB'),
                    "Tarikh Tamat": p.dateEnd ? new Date(p.dateEnd).toLocaleDateString('en-GB') : "-",
                    "Tempat": p.venue || "-",
                    "Latitud": p.location?.lat || "",
                    "Longitud": p.location?.lng || "",
                    "Google Maps": p.location?.lat ? `http://maps.google.com/?q=${p.location.lat},${p.location.lng}` : "",
                    "Perincian Sasaran": targetStr,
                    "Jumlah Peserta": p.participantCount,
                    "Naratif": p.description || "-"
                };
            });

            const ws = XLSX.utils.json_to_sheet(excelRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Aktiviti STEM");
            XLSX.writeFile(wb, `Laporan_Aktiviti_${exportDates.start}_${exportDates.end}.xlsx`);

            setIsExportModalOpen(false);
            setExporting(false);
            setExportDates({ start: "", end: "" });

            setTimeout(() => {
                Swal.fire({
                    title: "Selesai!",
                    text: "Laporan berjaya dimuat turun.",
                    icon: "success",
                    confirmButtonText: "OK",
                    confirmButtonColor: "#16a34a"
                });
            }, 100);

        } catch (error) {
            console.error(error);
            setExporting(false);
            setIsExportModalOpen(false);

            setTimeout(() => {
                Swal.fire({
                    title: "Ralat",
                    text: "Gagal memuat turun laporan. Sila cuba lagi.",
                    icon: "error",
                    confirmButtonText: "OK",
                    confirmButtonColor: "#dc2626"
                }).then(() => {
                    setIsExportModalOpen(true); // Buka balik modal
                });
            }, 100);
        }
    };

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "";

    // Filter Strategi ikut Teras yang dipilih
    const filteredStrategies = formData.teras
        ? strategyList.filter(s => {
            const terasId = s.teras?._id || s.teras;
            return terasId === formData.teras;
        })
        : [];

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Jurnal Aktiviti STEM</h1>
                    <p className="text-slate-600">Rekod pelaksanaan program dan pemetaan lokasi.</p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={() => setIsExportModalOpen(true)} variant="outline" className="gap-2 border-green-600 text-green-700 hover:bg-green-50">
                        <FileSpreadsheet className="h-4 w-4" /> Eksport Data
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
                        <PlusCircle className="h-4 w-4" /> Lapor Aktiviti
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border shadow-sm w-fit">
                <span className="text-sm font-medium px-2 text-slate-600">Tapis Peringkat:</span>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                    <SelectTrigger className="w-[200px] border-none shadow-none focus:ring-0 h-8"><SelectValue placeholder="Semua Peringkat" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Semua Peringkat</SelectItem>
                        {levelOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <Card className="shadow-md border-slate-200">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100 border-b border-slate-200">
                                <TableHead className="w-[60px] text-center font-semibold text-slate-700 py-4">No.</TableHead>
                                <TableHead className="min-w-[280px] font-semibold text-slate-700 py-4">Maklumat Program</TableHead>
                                <TableHead className="w-[130px] text-center font-semibold text-slate-700 py-4">Peringkat</TableHead>
                                <TableHead className="w-[150px] text-center font-semibold text-slate-700 py-4">Tarikh Aktiviti</TableHead>
                                <TableHead className="w-[100px] text-center font-semibold text-slate-700 py-4">Lokasi</TableHead>
                                <TableHead className="w-[250px] font-bold text-slate-700 py-4">Sasaran</TableHead>
                                <TableHead className="w-[100px] text-right font-semibold text-slate-700 py-4 pr-6">Jum.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-500">Memuatkan...</TableCell></TableRow>
                            ) : programs.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">Tiada aktiviti dijumpai.</TableCell></TableRow>
                            ) : (
                                programs.map((p, index) => (
                                    <TableRow key={p._id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                        <TableCell className="text-center font-medium text-slate-500 align-top py-4">{index + 1}</TableCell>

                                        <TableCell className="align-top py-4">
                                            <div className="flex flex-col gap-1">
                                                {p.teras && (
                                                    <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0 border-purple-200 text-purple-700 bg-purple-50 mb-1">
                                                        {p.teras.code ? `${p.teras.code}: ` : ""}{p.teras.name}
                                                    </Badge>
                                                )}
                                                <span className="font-bold text-slate-900 text-base leading-tight">{p.title}</span>
                                                {p.description && <p className="text-sm text-slate-500 line-clamp-2 leading-snug mt-1">{p.description}</p>}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center align-top py-4">
                                            <Badge variant="secondary" className="whitespace-nowrap font-medium bg-slate-100 text-slate-700 border-slate-200">{p.programLevel}</Badge>
                                        </TableCell>

                                        <TableCell className="text-center text-sm align-top py-4 whitespace-nowrap font-medium text-slate-700 bg-slate-50/50">
                                            <div className="flex flex-col items-center justify-center gap-0.5">
                                                <span>{formatDate(p.dateStart)}</span>
                                                {p.dateEnd && formatDate(p.dateStart) !== formatDate(p.dateEnd) && (
                                                    <>
                                                        <span className="text-slate-400 text-[10px] leading-none py-0.5">-</span>
                                                        <span>{formatDate(p.dateEnd)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center align-top py-4">
                                            {p.location?.lat ? (
                                                <a href={`https://www.google.com/maps?q=${p.location.lat},${p.location.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all hover:scale-110 border border-blue-100 shadow-sm">
                                                    <MapPin className="h-4 w-4" />
                                                </a>
                                            ) : <span className="text-slate-300">-</span>}
                                        </TableCell>

                                        <TableCell className="align-top py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {p.targetGroups?.map((t, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-[11px] bg-white border-slate-200 shadow-sm px-2 py-0.5">
                                                        <span className="text-slate-600 mr-1">{t.group}:</span>
                                                        <span className="font-bold text-slate-900">{t.count}</span>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right align-top py-4 pr-6">
                                            <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-md border border-slate-200 shadow-sm">{p.participantCount}</span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* MODAL FORM */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl sm:rounded-xl">
                    <DialogHeader className="px-8 py-6 border-b bg-white sticky top-0 z-10">
                        <DialogTitle className="text-xl font-bold text-slate-900">Lapor Aktiviti Baru</DialogTitle>
                        <DialogDescription>Isi maklumat program dan tandakan lokasi di peta.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10 bg-slate-50/50">

                        {/* Kiri: Form */}
                        <div className="space-y-6">

                            {/* 1. SEKSYEN DASAR */}
                            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm space-y-4">
                                <h3 className="font-semibold text-blue-800 border-b border-blue-200 pb-2 mb-2 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Pautan Dasar STEM (Wajib)
                                </h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-blue-900 text-xs uppercase font-bold tracking-wide">
                                            Pilih Teras <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={formData.teras}
                                            onValueChange={(val) => setFormData({ ...formData, teras: val, strategy: "" })}
                                        >
                                            <SelectTrigger className={`bg-white border-blue-200 ${!formData.teras && 'border-red-300 border-2'}`}>
                                                <SelectValue placeholder="Pilih Teras Strategik" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {terasList.map(t => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-blue-900 text-xs uppercase font-bold tracking-wide">Pilih Inisiatif Strategik</Label>
                                        <Select value={formData.strategy} onValueChange={(val) => setFormData({ ...formData, strategy: val })} disabled={!formData.teras}>
                                            <SelectTrigger className="bg-white border-blue-200"><SelectValue placeholder={!formData.teras ? "Sila pilih teras dahulu" : "Pilih Strategi"} /></SelectTrigger>
                                            <SelectContent>
                                                {filteredStrategies.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* 2. MAKLUMAT PROGRAM */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <Label className="text-slate-700">
                                    Tajuk Program <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Contoh: Karnival STEM"
                                    className={`bg-slate-50 border-slate-200 focus:bg-white ${!formData.title && 'border-red-300 border-2'}`}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tarikh Mula <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="date"
                                            name="dateStart"
                                            value={formData.dateStart}
                                            onChange={handleChange}
                                            className={`bg-slate-50 ${!formData.dateStart && 'border-red-300 border-2'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tarikh Tamat</Label>
                                        <Input type="date" name="dateEnd" value={formData.dateEnd} onChange={handleChange} className="bg-slate-50" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Peringkat <span className="text-red-500">*</span></Label>
                                    <Select value={formData.programLevel} onValueChange={(val) => setFormData({ ...formData, programLevel: val })}>
                                        <SelectTrigger className={`bg-slate-50 ${!formData.programLevel && 'border-red-300 border-2'}`}><SelectValue /></SelectTrigger>
                                        <SelectContent>{levelOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Penganjur <span className="text-red-500">*</span></Label>
                                    <Input
                                        name="organizerName"
                                        value={formData.organizerName}
                                        onChange={handleChange}
                                        placeholder="Nama penganjur"
                                        className={`bg-slate-50 ${!formData.organizerName && 'border-red-300 border-2'}`}
                                    />
                                </div>
                            </div>

                            {/* 3. PESERTA */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex justify-between border-b pb-2">
                                    <Label className="font-bold text-blue-800">
                                        Peserta <span className="text-red-500">*</span>
                                    </Label>
                                    <Badge className="bg-blue-600">Total: {formData.participantCount}</Badge>
                                </div>
                                <p className="text-xs text-slate-500 -mt-2">Pilih sekurang-kurangnya satu kumpulan sasaran</p>
                                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                    {targetOptions.map(opt => {
                                        const isChecked = formData.targetGroups.some(t => t.group === opt);
                                        return (
                                            <div key={opt} className={`flex justify-between gap-4 p-3 rounded-lg border ${isChecked ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                                                <div className="flex items-center space-x-3">
                                                    <Checkbox checked={isChecked} onCheckedChange={(c) => handleTargetCheck(opt, c)} />
                                                    <label className="text-sm font-medium">{opt}</label>
                                                </div>
                                                <Input
                                                    type="number"
                                                    disabled={!isChecked}
                                                    placeholder="0"
                                                    className="w-24 h-9 text-right"
                                                    value={formData.targetGroups.find(t => t.group === opt)?.count || ""}
                                                    onChange={(e) => handleTargetCountChange(opt, e.target.value)}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Kanan: Map */}
                        <div className="space-y-6 flex flex-col h-full">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex-1 flex flex-col">
                                <Label>Lokasi / Venue <span className="text-red-500">*</span></Label>
                                <Input
                                    name="venue"
                                    value={formData.venue}
                                    onChange={handleChange}
                                    placeholder="Cari lokasi..."
                                    className={`bg-slate-50 ${!formData.venue && 'border-red-300 border-2'}`}
                                />
                                <div className="flex-1 min-h-[300px] border-2 border-slate-100 rounded-lg overflow-hidden relative">
                                    <MapContainer center={[formData.lat, formData.lng]} zoom={10} style={{ height: "100%", width: "100%" }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                                        <SearchField onLocationFound={handleSearchLocation} />
                                        <LocationPicker position={{ lat: formData.lat, lng: formData.lng }} setPosition={(pos) => setFormData({ ...formData, lat: pos.lat, lng: pos.lng })} />
                                    </MapContainer>
                                </div>
                                <div className="space-y-2">
                                    <Label>Naratif Ringkas (Pilihan)</Label>
                                    <Textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={3}
                                        placeholder="Naratif ringkas program (10-15 patah perkataan sahaja)..."
                                        className="bg-slate-50 resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ✅ UPDATED: Footer dengan Loading State */}
                    <DialogFooter className="px-8 py-5 border-t bg-white">
                        <Button
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isSaving}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed min-w-[120px]"
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin">⏳</span>
                                    Menyimpan...
                                </span>
                            ) : (
                                "Simpan"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL EXPORT */}
            <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Muat Turun Laporan</DialogTitle>
                        <DialogDescription>Pilih julat tarikh aktiviti untuk dieksport ke Excel.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Tarikh Mula <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                value={exportDates.start}
                                onChange={(e) => setExportDates({ ...exportDates, start: e.target.value })}
                                className={!exportDates.start ? 'border-red-300 border-2' : ''}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tarikh Tamat <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                value={exportDates.end}
                                onChange={(e) => setExportDates({ ...exportDates, end: e.target.value })}
                                className={!exportDates.end ? 'border-red-300 border-2' : ''}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsExportModalOpen(false)}
                            disabled={exporting}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={exporting}
                            className="gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed min-w-[160px]"
                        >
                            {exporting ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin">⏳</span>
                                    Sedang Menjana...
                                </span>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Muat Turun Excel
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default ProgramReportsPage;