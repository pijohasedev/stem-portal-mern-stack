import api from '@/api';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input"; // Pastikan ada (shadcn)
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    Eye,
    FileText,
    MoreHorizontal,
    Pencil,
    Search,
    Trash2
} from "lucide-react";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from "sweetalert2";

function ReportHistory() {
    const [reports, setReports] = useState([]);
    const [groupedReports, setGroupedReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMyReports = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await api.get('/reports/my-reports', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setReports(res.data);
                groupReportsByPolicy(res.data);
            } catch (error) {
                console.error("Failed to fetch reports:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyReports();
    }, []);

    // Re-group bila search berubah
    useEffect(() => {
        if (reports.length > 0) {
            const filtered = reports.filter(r =>
                r.initiative?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.initiative?.policyName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            groupReportsByPolicy(filtered);
        }
    }, [searchTerm, reports]);

    const groupReportsByPolicy = (reportsData) => {
        const grouped = {};
        reportsData.forEach(report => {
            const policyName = report.initiative?.policyName || 'Unassigned Policy';
            const policyId = report.initiative?.policyId || 'unassigned';

            if (!grouped[policyId]) {
                grouped[policyId] = {
                    policyId,
                    policyName,
                    reports: []
                };
            }
            grouped[policyId].reports.push(report);
        });

        const groupedArray = Object.values(grouped).sort((a, b) =>
            a.policyName.localeCompare(b.policyName)
        );
        setGroupedReports(groupedArray);
    };

    const handleDeleteReport = async (reportId) => {
        const confirm = await Swal.fire({
            title: "Adakah anda pasti?",
            text: "Laporan ini akan dipadam secara kekal.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonText: "Batal",
            confirmButtonText: "Ya, padam!"
        });

        if (confirm.isConfirmed) {
            try {
                const token = localStorage.getItem("authToken");
                await api.delete(`/reports/${reportId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire("Berjaya!", "Laporan telah dipadam.", "success");
                setReports(prev => prev.filter(r => r._id !== reportId));
            } catch (error) {
                Swal.fire("Ralat!", "Gagal memadam laporan.", "error");
            }
        }
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            "Approved": "bg-emerald-100 text-emerald-700 border-emerald-200",
            "Needs Revision": "bg-red-100 text-red-700 border-red-200",
            "Pending Review": "bg-amber-100 text-amber-700 border-amber-200",
            "Draft": "bg-slate-100 text-slate-700 border-slate-200"
        };
        const icons = {
            "Approved": <CheckCircle2 className="w-3 h-3 mr-1" />,
            "Needs Revision": <AlertCircle className="w-3 h-3 mr-1" />,
            "Pending Review": <Clock className="w-3 h-3 mr-1" />,
            "Draft": <FileText className="w-3 h-3 mr-1" />
        };

        return (
            <Badge variant="outline" className={`${styles[status] || styles["Draft"]} pl-2 pr-3 py-1 font-medium`}>
                {icons[status] || icons["Draft"]} {status}
            </Badge>
        );
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
                <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
                <div className="h-4 w-48 bg-slate-200 rounded"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sejarah Laporan</h1>
                    <p className="text-slate-500 mt-1">Urus dan pantau laporan kemajuan inisiatif anda.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cari laporan..."
                            className="pl-9 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => navigate('/submit-report')} className="bg-blue-600 hover:bg-blue-700">
                        <Activity className="h-4 w-4 mr-2" /> Hantar Laporan
                    </Button>
                </div>
            </div>

            {/* --- SUMMARY CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Menunggu Semakan</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reports.filter(r => r.status === 'Pending Review').length}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Disahkan</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reports.filter(r => r.status === 'Approved').length}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Perlu Pembetulan</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reports.filter(r => r.status === 'Needs Revision').length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* --- CONTENT (ACCORDION) --- */}
            {groupedReports.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">Tiada Laporan</h3>
                    <p className="text-slate-500 mb-4">Anda belum menghantar sebarang laporan atau carian tidak dijumpai.</p>
                    <Button variant="outline" onClick={() => navigate('/submit-report')}>Hantar Laporan Sekarang</Button>
                </div>
            ) : (
                <Accordion type="multiple" className="space-y-4">
                    {groupedReports.map((group, index) => (
                        <AccordionItem key={group.policyId} value={group.policyId} className="border rounded-lg bg-white shadow-sm px-4">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3 text-left w-full">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-lg text-slate-800">{group.policyName}</div>
                                        <div className="text-xs text-slate-500 font-normal">
                                            {group.reports.length} Laporan Berkaitan
                                        </div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pt-2">
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b text-slate-500">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium w-1/3">Inisiatif</th>
                                                <th className="px-4 py-3 text-left font-medium">Tempoh</th>
                                                <th className="px-4 py-3 text-left font-medium">Kemajuan KPI</th>
                                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                                <th className="px-4 py-3 text-left font-medium">Tarikh</th>
                                                <th className="px-4 py-3 text-right font-medium">Tindakan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {group.reports.map((report) => {
                                                const kpiValue = report.kpiSnapshot !== undefined ? report.kpiSnapshot : (report.initiative?.kpi?.currentValue || 0);
                                                const target = report.initiative?.kpi?.target || 0;
                                                const percent = target > 0 ? (kpiValue / target) * 100 : 0;

                                                return (
                                                    <tr key={report._id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-slate-700">
                                                            {report.initiative?.name || "N/A"}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            <Badge variant="secondary" className="font-normal bg-slate-100 text-slate-600 border-slate-200">
                                                                {report.period}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col gap-1 w-32">
                                                                <div className="flex justify-between text-xs text-slate-500">
                                                                    <span>{kpiValue} / {target}</span>
                                                                    <span>{percent.toFixed(0)}%</span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                                        style={{ width: `${Math.min(percent, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <StatusBadge status={report.status} />
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                                            {new Date(report.createdAt).toLocaleDateString("ms-MY")}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                                                    onClick={() => navigate(`/report/${report._id}`)}
                                                                    title="Lihat"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>

                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuLabel>Pilihan</DropdownMenuLabel>
                                                                        <DropdownMenuSeparator />

                                                                        {/* Edit hanya jika perlu revision */}
                                                                        {report.status === 'Needs Revision' && (
                                                                            <DropdownMenuItem onClick={() => navigate(`/edit-report/${report._id}`)}>
                                                                                <Pencil className="mr-2 h-4 w-4" /> Kemaskini
                                                                            </DropdownMenuItem>
                                                                        )}

                                                                        {/* Delete hanya jika belum Approved */}
                                                                        {report.status !== 'Approved' && (
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleDeleteReport(report._id)}
                                                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                            >
                                                                                <Trash2 className="mr-2 h-4 w-4" /> Padam
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </div>
    );
}

export default ReportHistory;