import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDownIcon, ChevronRightIcon, Eye, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from "sweetalert2";


function ReportHistory() {
    const [reports, setReports] = useState([]);
    const [groupedReports, setGroupedReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedPolicies, setExpandedPolicies] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMyReports = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await api.get('/reports/my-reports', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log('Fetched reports:', res.data);
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

    const groupReportsByPolicy = (reportsData) => {
        // Group reports by policy
        const grouped = {};

        reportsData.forEach(report => {
            // Get policy info from initiative
            const policyName = report.initiative?.policyName || 'Unassigned Policy';
            const policyId = report.initiative?.policyId || 'unassigned';

            if (!grouped[policyId]) {
                grouped[policyId] = {
                    policyId: policyId,
                    policyName: policyName,
                    reports: []
                };
            }

            grouped[policyId].reports.push(report);
        });

        // Convert to array and sort by policy name
        const groupedArray = Object.values(grouped).sort((a, b) =>
            a.policyName.localeCompare(b.policyName)
        );

        setGroupedReports(groupedArray);
    };

    const togglePolicy = (policyId) => {
        setExpandedPolicies(prev => ({
            ...prev,
            [policyId]: !prev[policyId]
        }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-green-200';
            case 'Needs Revision':
                return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-200';
            case 'Pending Review':
            default:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 border-yellow-200';
        }
    };

    const calculateProgress = (report) => {
        if (!report.initiative?.kpi) return 0;
        const { currentValue = 0, target } = report.initiative.kpi;
        if (target === 0) return 0;
        return Math.min(((currentValue / target) * 100), 100).toFixed(1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your reports...</p>
                </div>
            </div>
        );
    }

    const handleDeleteReport = async (reportId) => {
        const token = localStorage.getItem("authToken");

        const confirm = await Swal.fire({
            title: "Are you sure?",
            text: "This report will be permanently deleted.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Yes, delete it!"
        });

        if (confirm.isConfirmed) {
            try {
                await api.delete(`/reports/${reportId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                Swal.fire("Deleted!", "The report has been removed.", "success");

                // Refresh senarai tanpa reload page
                setReports(prev => prev.filter(r => r._id !== reportId));

            } catch (error) {
                console.error("Failed to delete report:", error);
                Swal.fire("Error!", "Unable to delete the report.", "error");
            }
        }
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-bold">Sejarah Laporan</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Jumlah Laporan: {reports.length}
                    </p>
                </div>
                <Button onClick={() => navigate('/submit-report')}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Hantar Laporan Baharu
                </Button>
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
                        <div className="text-2xl font-bold text-yellow-600">
                            {reports.filter(r => r.status === 'Pending Review').length}
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
                            {reports.filter(r => r.status === 'Approved').length}
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
                            {reports.filter(r => r.status === 'Needs Revision').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Policy Accordion with Reports */}
            <div className="space-y-4">
                {groupedReports.length > 0 ? (
                    groupedReports.map(policyGroup => {
                        const isExpanded = expandedPolicies[policyGroup.policyId];
                        const reportCount = policyGroup.reports.length;

                        return (
                            <Card key={policyGroup.policyId} className="overflow-hidden">
                                {/* Policy Header - Clickable */}
                                <div
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20"
                                    onClick={() => togglePolicy(policyGroup.policyId)}
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <ChevronDownIcon className="h-6 w-6 text-blue-600" />
                                        ) : (
                                            <ChevronRightIcon className="h-6 w-6 text-blue-400" />
                                        )}
                                        <div>
                                            <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                                {policyGroup.policyName}
                                            </h2>
                                            <p className="text-sm text-muted-foreground">
                                                {reportCount} {reportCount === 1 ? 'Report' : 'Reports'}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                                        Policy
                                    </Badge>
                                </div>

                                {/* Reports Table - Only show when expanded */}
                                {isExpanded && (
                                    <CardContent className="p-0 animate-enter">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[200px]">Inisiatif</TableHead>
                                                        <TableHead>Tempoh</TableHead>
                                                        <TableHead>Kemajuan KPI</TableHead>
                                                        <TableHead>Semasa / Sasaran</TableHead>
                                                        <TableHead>Tarikh Hantar</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead className="text-right">Tindakan</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {policyGroup.reports.map(report => {
                                                        const progress = calculateProgress(report);
                                                        const currentValue = report.initiative?.kpi?.currentValue || 0;
                                                        const target = report.initiative?.kpi?.target || 0;
                                                        const unit = report.initiative?.kpi?.unit || '';

                                                        return (
                                                            <TableRow key={report._id}>
                                                                <TableCell className="font-medium">
                                                                    {report.initiative?.name || 'N/A'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">
                                                                        {report.period}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 min-w-[80px]">
                                                                            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                                                                <div
                                                                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                                                                    style={{ width: `${progress}%` }}
                                                                                ></div>
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-xs font-medium text-muted-foreground min-w-[45px]">
                                                                            {progress}%
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-sm">
                                                                    <span className="font-semibold">{currentValue}</span>
                                                                    <span className="text-muted-foreground"> / {target}</span>
                                                                    <span className="text-xs text-muted-foreground ml-1">
                                                                        {unit}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">
                                                                    {formatDate(report.createdAt)}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={getStatusColor(report.status)}
                                                                    >
                                                                        {report.status}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => navigate(`/report/${report._id}`)}
                                                                        >
                                                                            <Eye className="h-4 w-4 mr-1" />
                                                                            Lihat
                                                                        </Button>



                                                                        {report.status === 'Needs Revision' && (
                                                                            <Button
                                                                                variant="default"
                                                                                size="sm"
                                                                                onClick={() => navigate(`/edit-report/${report._id}`)}
                                                                            >
                                                                                <Pencil className="h-4 w-4 mr-1" />
                                                                                Edit
                                                                            </Button>
                                                                        )}

                                                                        <Button
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            onClick={() => handleDeleteReport(report._id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                                            Delete
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>

                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })
                ) : (
                    <Card>
                        <CardContent className="py-16">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <TrendingUp className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium mb-2">No reports yet</p>
                                <p className="text-sm mb-4">Submit your first progress report to get started.</p>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/submit-report')}
                                >
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Submit Report
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default ReportHistory;