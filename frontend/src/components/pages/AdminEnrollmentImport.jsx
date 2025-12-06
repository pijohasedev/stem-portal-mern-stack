import api from '@/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

    // Fungsi untuk membersihkan nama key
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

                    // 1. Baca SEMUA data sebagai Array of Arrays (baris demi baris)
                    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

                    // 2. Cari baris Header yang sebenar
                    let headerRowIndex = -1;
                    for (let i = 0; i < Math.min(rawRows.length, 20); i++) { // Cari dalam 20 baris pertama
                        const rowStr = rawRows[i].map(cell => cleanKey(cell)).join(" ");
                        // Cari keywords penting
                        if (rowStr.includes("kodsekolah") || rowStr.includes("namasekolah") || rowStr.includes("stema")) {
                            headerRowIndex = i;
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                        throw new Error("Tidak dapat mengesan baris tajuk (Header). Pastikan ada lajur 'Kod Sekolah'.");
                    }

                    // 3. Ambil Header dan Data
                    const headers = rawRows[headerRowIndex];
                    const dataRows = rawRows.slice(headerRowIndex + 1);

                    // Simpan info debug
                    setDebugInfo({
                        detectedRow: headerRowIndex + 1,
                        detectedHeaders: headers
                    });

                    // 4. Map Data
                    const formattedData = dataRows.map(row => {
                        // Helper function untuk ambil value berdasarkan index header
                        const getVal = (keywords) => {
                            // Cari index lajur yang match keywords
                            const index = headers.findIndex(h => {
                                const hClean = cleanKey(h);
                                return keywords.some(k => hClean === cleanKey(k));
                            });
                            return index !== -1 ? row[index] : null;
                        };

                        return {
                            stateName: getVal(['Negeri', 'State']),
                            ppdName: getVal(['PPD', 'Nama PPD', 'Pejabat Pendidikan Daerah']),

                            schoolCode: getVal(['Kod Sekolah', 'Kod', 'Code', 'KOD SEKOLAH']),
                            schoolName: getVal(['Nama Sekolah', 'Nama', 'Name', 'NAMA SEKOLAH']),
                            schoolType: getVal(['Jenis Sekolah', 'Jenis', 'Type']),

                            stemA: Number(getVal(['STEM A', 'STEMA', 'Pakej A'])) || 0,
                            stemB: Number(getVal(['STEM B', 'STEMB', 'Pakej B'])) || 0,
                            stemC1: Number(getVal(['STEM C1', 'STEMC1'])) || 0,
                            stemC2: Number(getVal(['STEM C2', 'STEMC2'])) || 0,

                            categoryE: Number(getVal(['Kategori E', 'Kat E', 'Kemanusiaan'])) || 0,
                            categoryF: Number(getVal(['Kategori F', 'Kat F', 'MPV'])) || 0,

                            nonStem: Number(getVal(['Bukan STEM', 'Bukan', 'Non STEM'])) || 0,
                            totalStudents: Number(getVal(['Jumlah Murid', 'Jumlah', 'Total', 'Grand Total'])) || 0,
                        };
                    });

                    // Tapis baris kosong
                    const cleanData = formattedData.filter(d => d.schoolCode && String(d.schoolCode).trim() !== "");
                    setPreviewData(cleanData);

                } catch (error) {
                    console.error("Ralat:", error);
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
            await api.post('/enrollment/import', {
                year, month, data: previewData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire("Berjaya", `Import ${previewData.length} rekod berjaya!`, "success");
            setPreviewData([]);
            setFile(null);
            setDebugInfo(null);
            document.querySelector('input[type="file"]').value = "";
        } catch (error) {
            Swal.fire("Ralat", "Gagal memuat naik ke server.", "error");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Import Data Enrolmen</h1>
            </div>

            <Card>
                <CardHeader><CardTitle>Pilih Fail</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    <SelectItem value="6">Jun</SelectItem>
                                    <SelectItem value="10">Oktober</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Fail Excel</Label>
                            <Input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                        </div>
                    </div>

                    {/* Paparan Debug Header */}
                    {debugInfo && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded border border-blue-100">
                            <strong>Info Debug:</strong> Header dikesan pada baris #{debugInfo.detectedRow}. <br />
                            Lajur: {debugInfo.detectedHeaders.join(" | ")}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <Button onClick={handleUpload} disabled={uploading || previewData.length === 0}>
                            {uploading ? "Sedang Memproses..." : `Sahkan & Import ${previewData.length} Rekod`}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {previewData.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Pratonton ({previewData.length} rekod)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-auto max-h-[500px]">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-100">
                                        <TableHead>Kod</TableHead>
                                        <TableHead>Nama Sekolah</TableHead>
                                        <TableHead className="text-center">STEM A</TableHead>
                                        <TableHead className="text-center">STEM B</TableHead>
                                        <TableHead className="text-center">STEM C1</TableHead>
                                        <TableHead className="text-center">STEM C2</TableHead>
                                        <TableHead className="text-center">Kat. E</TableHead>
                                        <TableHead className="text-center">Kat. F</TableHead>
                                        <TableHead className="text-center">Bukan</TableHead>
                                        <TableHead className="text-right font-bold">Jumlah</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.slice(0, 20).map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-mono text-xs">{row.schoolCode}</TableCell>
                                            <TableCell className="text-xs">{row.schoolName}</TableCell>
                                            <TableCell className="text-center">{row.stemA}</TableCell>
                                            <TableCell className="text-center">{row.stemB}</TableCell>
                                            <TableCell className="text-center">{row.stemC1}</TableCell>
                                            <TableCell className="text-center">{row.stemC2}</TableCell>
                                            <TableCell className="text-center">{row.categoryE}</TableCell>
                                            <TableCell className="text-center">{row.categoryF}</TableCell>
                                            <TableCell className="text-center">{row.nonStem}</TableCell>
                                            <TableCell className="text-right font-bold">{row.totalStudents}</TableCell>
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