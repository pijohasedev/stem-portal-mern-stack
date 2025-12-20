import api from "@/api";
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
import { Input } from "@/components/ui/input"; // Pastikan ada komponen ini atau guna <input> biasa
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    Filter,
    MoreHorizontal,
    Search,
    TrendingUp
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

function ReportMonitor() {
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(""); // State carian
    const navigate = useNavigate();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const res = await api.get("/reports", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setReports(res.data);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- LOGIC SEARCH ---
    const filteredReports = reports.filter((r) => {
        const term = searchTerm.toLowerCase();
        return (
            r.initiative?.name?.toLowerCase().includes(term) ||
            r.initiative?.strategy?.teras?.policy?.name?.toLowerCase().includes(term) ||
            r.owner?.firstName?.toLowerCase().includes(term)
        );
    });

    // --- GROUPING LOGIC ---
    const grouped = filteredReports.reduce((acc, report) => {
        const policyName = report.initiative?.strategy?.teras?.policy?.name || "Unassigned Policy";
        const initiativeName = report.initiative?.name || "Unnamed Initiative";

        if (!acc[policyName]) acc[policyName] = {};
        if (!acc[policyName][initiativeName]) acc[policyName][initiativeName] = [];
        acc[policyName][initiativeName].push(report);

        return acc;
    }, {});

    const countByStatus = (status) => reports.filter((r) => r.status === status).length;

    // --- ACTIONS ---
    const handleApprove = async (reportId) => {
        const token = localStorage.getItem('authToken');
        try {
            await api.patch(`/reports/${reportId}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            updateReportStatus(reportId, "Approved");
            Swal.fire("Berjaya!", "Laporan telah disahkan.", "success");
        } catch (error) {
            console.error("Failed to approve report:", error);
            Swal.fire("Ralat", "Gagal mengesahkan laporan.", "error");
        }
    };

    const handleNeedsRevision = async (reportId) => {
        const token = localStorage.getItem('authToken');
        const { value: feedback } = await Swal.fire({
            title: "Semakan Diperlukan",
            input: "textarea",
            inputLabel: "Sila nyatakan sebab pemulangan laporan:",
            inputPlaceholder: "Contoh: Sila lampirkan bukti gambar...",
            showCancelButton: true,
            confirmButtonText: "Hantar",
            confirmButtonColor: "#d33",
            preConfirm: (value) => {
                if (!value) Swal.showValidationMessage("Nota diperlukan!");
                return value;
            }
        });

        if (!feedback) return;

        try {
            await api.patch(`/reports/${reportId}/status`, {
                status: "Needs Revision",
                feedback,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            updateReportStatus(reportId, "Needs Revision", feedback);
            Swal.fire("Dihantar!", "Nota semakan telah dihantar kepada pemilik.", "success");
        } catch (error) {
            console.error("Failed to mark report:", error);
            Swal.fire("Ralat", "Gagal menghantar nota.", "error");
        }
    };

    const updateReportStatus = (id, status, feedback = null) => {
        setReports((prev) => prev.map((r) => r._id === id ? { ...r, status, feedback } : r));
    };

    // --- HELPER COMPONENT: STATUS BADGE ---
    const StatusBadge = ({ status }) => {
        const styles = {
            "Approved": "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
            "Needs Revision": "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
            "Pending Review": "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
            "Draft": "bg-slate-100 text-slate-700 border-slate-200"
        };
        const icons = {
            "Approved": <CheckCircle2 className="w-3 h-3 mr-1" />,
            "Needs Revision": <AlertCircle className="w-3 h-3 mr-1" />,
            "Pending Review": <Clock className="w-3 h-3 mr-1" />,
            "Draft": <FileText className="w-3 h-3 mr-1" />
        };

        return (
            <Badge variant="outline" className={`${styles[status] || styles["Draft"]} transition-colors pl-2 pr-3 py-1`}>
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

            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pemantauan Pelaporan</h1>
                    <p className="text-slate-500 mt-1">Semak dan sahkan laporan kemajuan inisiatif daripada pegawai.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cari inisiatif, polisi atau pegawai..."
                        className="pl-9 bg-white shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* --- SUMMARY CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Jumlah Laporan</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reports.length}</div>
                        <p className="text-xs text-slate-500 mt-1">Keseluruhan rekod</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Menunggu Semakan</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{countByStatus("Pending Review")}</div>
                        <p className="text-xs text-slate-500 mt-1">Perlu tindakan segera</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Disahkan</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{countByStatus("Approved")}</div>
                        <p className="text-xs text-slate-500 mt-1">Laporan lengkap</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Perlu Pembetulan</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{countByStatus("Needs Revision")}</div>
                        <p className="text-xs text-slate-500 mt-1">Dikembalikan kepada pegawai</p>
                    </CardContent>
                </Card>
            </div>

            {/* --- CONTENT SECTION --- */}
            {Object.keys(grouped).length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed">
                    <Filter className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">Tiada Laporan Dijumpai</h3>
                    <p className="text-slate-500">Tiada laporan yang sepadan dengan carian anda.</p>
                </div>
            ) : (
                <Accordion type="multiple" className="space-y-4">
                    {Object.entries(grouped).map(([policyName, initiatives], index) => (
                        <AccordionItem key={policyName} value={policyName} className="border rounded-lg bg-white shadow-sm px-4">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3 text-left">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-lg text-slate-800">{policyName}</div>
                                        <div className="text-xs text-slate-500 font-normal">
                                            {Object.keys(initiatives).length} Inisiatif Berkaitan
                                        </div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-6 pt-2">
                                <div className="space-y-6">
                                    {Object.entries(initiatives).map(([initiativeName, initiativeReports]) => (
                                        <div key={initiativeName} className="border rounded-lg overflow-hidden bg-slate-50/50">
                                            {/* Initiative Header */}
                                            <div className="bg-slate-100/80 px-4 py-3 border-b flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-blue-600" />
                                                    <h4 className="font-semibold text-slate-800">{initiativeName}</h4>
                                                </div>
                                            </div>

                                            {/* Table */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-white border-b text-slate-500">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left font-medium w-32">Tempoh</th>
                                                            <th className="px-4 py-3 text-left font-medium w-48">Pegawai</th>
                                                            <th className="px-4 py-3 text-left font-medium w-32">KPI</th>
                                                            <th className="px-4 py-3 text-left font-medium w-40">Status</th>
                                                            <th className="px-4 py-3 text-left font-medium">Tarikh Hantar</th>
                                                            <th className="px-4 py-3 text-right font-medium w-24">Tindakan</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 bg-white">
                                                        {initiativeReports.map((report) => {
                                                            const kpiValue = report.kpiSnapshot !== undefined ? report.kpiSnapshot : (report.initiative?.kpi?.currentValue || 0);
                                                            const target = report.initiative?.kpi?.target || 0;
                                                            const percent = target > 0 ? (kpiValue / target) * 100 : 0;

                                                            return (
                                                                <tr key={report._id} className="hover:bg-slate-50 transition-colors group">
                                                                    <td className="px-4 py-3 font-medium text-slate-700">
                                                                        {report.period}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                                                {report.owner?.firstName?.[0]}{report.owner?.lastName?.[0]}
                                                                            </div>
                                                                            <span className="text-slate-600">
                                                                                {report.owner?.firstName}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex flex-col gap-1 w-24">
                                                                            <div className="flex justify-between text-xs text-slate-500">
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
                                                                        {new Date(report.createdAt).toLocaleDateString("ms-MY", {
                                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                                        })}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 w-8 p-0 hover:text-blue-600"
                                                                                onClick={() => navigate(`/report/${report._id}`, { state: { from: 'report-monitor' } })}
                                                                            >
                                                                                <FileText className="h-4 w-4" />
                                                                            </Button>

                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
                                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end" className="w-48">
                                                                                    <DropdownMenuLabel>Tindakan</DropdownMenuLabel>
                                                                                    <DropdownMenuSeparator />
                                                                                    <DropdownMenuItem onClick={() => handleApprove(report._id)} className="text-emerald-600 cursor-pointer">
                                                                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Sahkan
                                                                                    </DropdownMenuItem>
                                                                                    <DropdownMenuItem onClick={() => handleNeedsRevision(report._id)} className="text-red-600 cursor-pointer">
                                                                                        <AlertCircle className="mr-2 h-4 w-4" /> Perlu Pembetulan
                                                                                    </DropdownMenuItem>
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
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </div>
    );
}

export default ReportMonitor;