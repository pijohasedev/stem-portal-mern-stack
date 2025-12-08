import api from '@/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, Info, UploadCloud } from "lucide-react";
import { useState } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

function AdminEnrollmentImport() {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [debugInfo, setDebugInfo] = useState(null);
    const [year, setYear] = useState("2025");
    const [month, setMonth] = useState("10");
    const [uploading, setUploading] = useState(false);

    const cleanKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, '');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setPreviewData([]);
        setDebugInfo(null);

        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const arrayBuffer = evt.target.result;
                    const wb = XLSX.read(arrayBuffer, { type: 'array' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

                    let headerRowIndex = -1;
                    for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
                        const rowStr = rawRows[i].map(cell => cleanKey(cell)).join(" ");
                        if (rowStr.includes("kodsekolah") || rowStr.includes("namasekolah")) {
                            headerRowIndex = i;
                            break;
                        }
                    }

                    if (headerRowIndex === -1) throw new Error("Header tidak dijumpai. Pastikan fail mengandungi lajur 'Kod Sekolah'.");

                    const headers = rawRows[headerRowIndex];
                    const dataRows = rawRows.slice(headerRowIndex + 1);

                    setDebugInfo({ detectedRow: headerRowIndex + 1, detectedHeaders: headers });

                    const formattedData = dataRows.map(row => {
                        const getVal = (keywords) => {
                            const index = headers.findIndex(h => {
                                const hClean = cleanKey(h);
                                return keywords.some(k => hClean === cleanKey(k));
                            });
                            return index !== -1 ? row[index] : null;
                        };

                        return {
                            stateName: getVal(['Negeri', 'State']),
                            ppdName: getVal(['PPD', 'Nama PPD']),
                            schoolCode: getVal(['Kod Sekolah', 'Kod']),
                            schoolName: getVal(['Nama Sekolah', 'Nama']),
                            schoolType: getVal(['Jenis Sekolah', 'Jenis']),
                            stemA: Number(getVal(['STEM A', 'STEMA'])) || 0,
                            stemB: Number(getVal(['STEM B', 'STEMB'])) || 0,
                            stemC1: Number(getVal(['STEM C1'])) || 0,
                            stemC2: Number(getVal(['STEM C2'])) || 0,
                            categoryE: Number(getVal(['Kategori E', 'Kat E'])) || 0,
                            categoryF: Number(getVal(['Kategori F', 'Kat F'])) || 0,
                            nonStem: Number(getVal(['Bukan STEM'])) || 0,
                            totalStudents: Number(getVal(['Jumlah Murid', 'Jumlah', 'Total', 'Grand Total'])) || 0,
                        };
                    });

                    const cleanData = formattedData.filter(d => d.schoolCode && String(d.schoolCode).trim() !== "");
                    setPreviewData(cleanData);

                } catch (error) {
                    Swal.fire("Ralat", error.message || "Gagal membaca fail.", "error");
                }
            };
            reader.readAsArrayBuffer(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (previewData.length === 0) return;
        setUploading(true);
        try {
            const token = localStorage.getItem('authToken');
            await api.post('/enrollment/import', { year, month, data: previewData }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire("Berjaya", `Import ${previewData.length} rekod berjaya!`, "success");
            setPreviewData([]);
            setFile(null);
            document.querySelector('input[type="file"]').value = "";
        } catch (error) {
            Swal.fire("Ralat", "Gagal memuat naik ke server.", "error");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">

            {/* HEADER - Seragam dengan KPMDashboard */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                        <UploadCloud className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Import Data Enrolmen</h1>
                        <p className="text-muted-foreground">Muat naik fail Excel (.xlsx) data enrolmen murid Tingkatan 4.</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" /> Tetapan Fail
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Tahun Data</Label>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2025">2025</SelectItem>
                                    <SelectItem value="2026">2026</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Bulan Data</Label>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="6">Jun</SelectItem>
                                    <SelectItem value="8">Ogos</SelectItem>
                                    <SelectItem value="10">Oktober</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Pilih Fail Excel</Label>
                            <Input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                                className="bg-slate-50 border-slate-200 file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-3 file:text-sm hover:file:bg-blue-100 transition-all cursor-pointer"
                            />
                        </div>
                    </div>

                    {debugInfo && (
                        <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                            <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-600" />
                            <div>
                                <p className="font-semibold">Struktur fail dikesan:</p>
                                <p>Header pada baris <strong>#{debugInfo.detectedRow}</strong>.</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t">
                        <Button
                            onClick={handleUpload}
                            disabled={uploading || previewData.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 min-w-[150px]"
                        >
                            {uploading ? (
                                <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Memproses...</span>
                            ) : (
                                `Sahkan & Import ${previewData.length > 0 ? `(${previewData.length})` : ''}`
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {previewData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pratonton Data (20 Rekod Pertama)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    {/* HEADER TABLE SERAGAM DENGAN KPM DASHBOARD */}
                                    <TableRow className="bg-slate-100 border-b border-slate-200">
                                        <TableHead className="w-[100px] font-bold text-slate-700">Kod</TableHead>
                                        <TableHead className="min-w-[250px] font-bold text-slate-700">Nama Sekolah</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 w-[80px]">STEM A</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 w-[80px]">STEM B</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 w-[80px]">STEM C1</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 w-[80px]">STEM C2</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 w-[80px]">Kat. E</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 w-[80px]">Kat. F</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 w-[80px]">Bukan</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 w-[100px] pr-6">Jumlah</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.slice(0, 20).map((row, i) => (
                                        <TableRow key={i} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                            <TableCell className="font-mono text-xs font-medium text-slate-600">{row.schoolCode}</TableCell>
                                            <TableCell className="text-sm font-medium text-slate-900">{row.schoolName}</TableCell>

                                            {/* Warna Latar Belakang Selang-seli untuk Kumpulan */}
                                            <TableCell className="text-center bg-blue-50/30 text-slate-700">{row.stemA}</TableCell>
                                            <TableCell className="text-center bg-blue-50/30 text-slate-700">{row.stemB}</TableCell>
                                            <TableCell className="text-center bg-blue-50/30 text-slate-700">{row.stemC1}</TableCell>
                                            <TableCell className="text-center bg-blue-50/30 text-slate-700">{row.stemC2}</TableCell>

                                            <TableCell className="text-center bg-yellow-50/30 text-slate-700">{row.categoryE}</TableCell>
                                            <TableCell className="text-center bg-yellow-50/30 text-slate-700">{row.categoryF}</TableCell>

                                            <TableCell className="text-center text-slate-500">{row.nonStem}</TableCell>
                                            <TableCell className="text-right font-bold pr-6">{row.totalStudents}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default AdminEnrollmentImport;