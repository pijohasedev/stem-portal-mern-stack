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
import { AlertTriangle, CheckCircle, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";


function ReportMonitor() {
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from || 'report-history';

    useEffect(() => {
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

        fetchReports();
    }, []);

    // Group by policy > initiative
    const grouped = reports.reduce((acc, report) => {
        const policyName =
            report.initiative?.strategy?.teras?.policy?.name || "Unassigned Policy";
        const initiativeName = report.initiative?.name || "Unnamed Initiative";

        if (!acc[policyName]) acc[policyName] = {};
        if (!acc[policyName][initiativeName])
            acc[policyName][initiativeName] = [];
        acc[policyName][initiativeName].push(report);

        return acc;
    }, {});

    const countByStatus = (status) =>
        reports.filter((r) => r.status === status).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading reports...</p>
                </div>
            </div>
        );
    }


    const handleApprove = async (reportId) => {
        const token = localStorage.getItem('authToken');
        try {
            await api.patch(`/reports/${reportId}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setReports((prev) =>
                prev.map((r) =>
                    r._id === reportId ? { ...r, status: "Approved" } : r
                )
            );
        } catch (error) {
            console.error("Failed to approve report:", error);
        }
    };

    const handleNeedsRevision = async (reportId) => {
        const token = localStorage.getItem('authToken');

        // 1️⃣ Minta nota daripada admin
        const { value: feedback } = await Swal.fire({
            title: "Add Revision Note",
            input: "textarea",
            inputLabel: "Please explain what needs to be revised:",
            inputPlaceholder: "Enter your feedback here...",
            inputAttributes: { 'aria-label': 'Feedback' },
            showCancelButton: true,
            confirmButtonText: "Submit Feedback",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#d33",
            preConfirm: (value) => {
                if (!value) {
                    Swal.showValidationMessage("Feedback note is required!");
                }
                return value;
            }
        });

        if (!feedback) return; // kalau admin tekan cancel, berhenti

        try {
            // 2️⃣ Hantar ke backend
            await api.patch(`/reports/${reportId}/status`, {
                status: "Needs Revision",
                feedback, // nota admin
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // 3️⃣ Kemaskini paparan
            setReports((prev) =>
                prev.map((r) =>
                    r._id === reportId
                        ? { ...r, status: "Needs Revision", feedback }
                        : r
                )
            );

            Swal.fire("Submitted!", "Revision feedback has been sent to the owner.", "success");
        } catch (error) {
            console.error("Failed to mark report as Needs Revision:", error);
            Swal.fire("Error", "Failed to send revision feedback.", "error");
        }
    };





    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Pemantauan Pelaporan</h1>
                    <p className="text-sm text-muted-foreground">
                        Jumlah Laporan: {reports.length}
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pending Review
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {countByStatus("Pending Review")}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Approved
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {countByStatus("Approved")}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Needs Revision
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {countByStatus("Needs Revision")}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Accordion by Policy */}
            <Accordion type="multiple" className="space-y-4">
                {Object.entries(grouped).map(([policyName, initiatives]) => (
                    <AccordionItem key={policyName} value={policyName}>
                        <AccordionTrigger className="text-lg font-semibold">
                            {policyName}
                        </AccordionTrigger>
                        <AccordionContent>
                            {Object.entries(initiatives).map(
                                ([initiativeName, initiativeReports]) => (
                                    <Card key={initiativeName} className="mb-4">
                                        <CardHeader>
                                            <CardTitle className="text-base font-semibold">
                                                {initiativeName}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left border-b">
                                                            <th className="py-2">Tempoh Laporan</th>
                                                            <th>Kemajuan KPI</th>
                                                            <th>Status</th>
                                                            <th>Dihantar Oleh</th>
                                                            <th>Tarikh</th>
                                                            <th className="text-right">Tindakan</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {initiativeReports.map((report) => (
                                                            <tr
                                                                key={report._id}
                                                                className="border-b last:border-0"
                                                            >
                                                                <td className="py-2">{report.period}</td>
                                                                <td>
                                                                    {(() => {
                                                                        // 1. Tentukan nilai KPI untuk dipaparkan (snapshot atau fallback ke terkini)
                                                                        const kpiValue = report.kpiSnapshot !== undefined
                                                                            ? report.kpiSnapshot
                                                                            : (report.initiative?.kpi?.currentValue || 0);

                                                                        // 2. Dapatkan sasaran
                                                                        const target = report.initiative?.kpi?.target || 0;

                                                                        // 3. Kira peratusan
                                                                        if (target > 0) {
                                                                            return `${((kpiValue / target) * 100).toFixed(1)}%`;
                                                                        }
                                                                        return "N/A";
                                                                    })()}
                                                                </td>
                                                                <td>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={
                                                                            report.status === "Approved"
                                                                                ? "bg-green-100 text-green-800"
                                                                                : report.status === "Needs Revision"
                                                                                    ? "bg-red-100 text-red-800"
                                                                                    : "bg-yellow-100 text-yellow-800"
                                                                        }
                                                                    >
                                                                        {report.status}
                                                                    </Badge>
                                                                </td>
                                                                <td>
                                                                    {report.owner?.firstName}{" "}
                                                                    {report.owner?.lastName}
                                                                </td>
                                                                <td>
                                                                    {new Date(
                                                                        report.createdAt
                                                                    ).toLocaleDateString("en-GB")}
                                                                </td>
                                                                <td className="text-right space-x-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => navigate(`/report/${report._id}`, { state: { from: 'report-monitor' } })}
                                                                    >
                                                                        Lihat
                                                                    </Button>

                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="outline" size="icon">
                                                                                <MoreVertical className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuLabel>Tindakan</DropdownMenuLabel>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleApprove(report._id)}
                                                                                className="text-green-600 font-medium cursor-pointer"
                                                                            >
                                                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                                                Mark as Approved
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleNeedsRevision(report._id)}
                                                                                className="text-red-600 font-medium cursor-pointer"
                                                                            >
                                                                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                                                                Mark as Needs Revision
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}

export default ReportMonitor;
