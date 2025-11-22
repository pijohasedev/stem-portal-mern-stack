import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { AlertTriangle, CalendarIcon } from "lucide-react"; // ✅ Tambah CalendarIcon
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

function ReportDetails() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const { id } = useParams();
    const location = useLocation();
    const from = location.state?.from || 'report-history';

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await api.get(`/reports/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setReport(res.data);
            } catch (error) {
                console.error("Failed to fetch report details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [id]);

    if (loading) {
        return <p className="text-center text-muted-foreground">Loading report details...</p>;
    }

    if (!report) {
        return <p className="text-center text-destructive">Report not found.</p>;
    }

    // KPI progress
    const currentValue = report.initiative?.kpi?.currentValue || 0;
    const target = report.initiative?.kpi?.target || 0;
    const unit = report.initiative?.kpi?.unit || '';
    const progress = target > 0 ? Math.min(((currentValue / target) * 100).toFixed(1), 100) : 0;

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
            case 'Needs Revision':
                return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
            default:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
        }
    };

    return (
        <div className="max-w-4xl mr-auto pl-2">
            <Link
                to={from === 'report-monitor' ? '/reports' : '/report-history'}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                {from === 'report-monitor' ? 'Back to Report Monitor' : 'Back to Report History'}
            </Link>

            {/* 🔹 Paparan amaran bila status = Needs Revision */}
            {report.status === "Needs Revision" && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-md shadow-sm">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-800">Revision Required</h3>
                            <p className="text-sm text-red-700">
                                This report was marked as <b>“Needs Revision”</b> by the administrator.
                            </p>
                            {report.feedback && (
                                <p className="mt-2 text-sm text-red-600 italic">
                                    Nota Admin: {report.feedback}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Report Card */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl font-bold">
                                {report.initiative?.name || 'N/A'}
                            </CardTitle>
                            <CardDescription>
                                Submitted on{" "}
                                {new Date(report.createdAt).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className={getStatusColor(report.status)}>
                            {report.status}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">

                    {/* ✅ TAMBAHAN: Tarikh Mula & Tamat Inisiatif */}
                    <div className="grid grid-cols-2 gap-4 border-b pb-4 mb-4">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tarikh Mula</p>
                            <div className="flex items-center gap-2 mt-1">
                                <CalendarIcon className="h-4 w-4 text-blue-500" />
                                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                    {report.initiative?.startDate
                                        ? new Date(report.initiative.startDate).toLocaleDateString('ms-MY', {
                                            day: '2-digit', month: 'long', year: 'numeric'
                                        })
                                        : 'Belum ditetapkan'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tarikh Tamat</p>
                            <div className="flex items-center gap-2 mt-1">
                                <CalendarIcon className="h-4 w-4 text-red-500" />
                                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                    {report.initiative?.endDate
                                        ? new Date(report.initiative.endDate).toLocaleDateString('ms-MY', {
                                            day: '2-digit', month: 'long', year: 'numeric'
                                        })
                                        : 'Belum ditetapkan'}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* --------------------------------------------- */}

                    {/* KPI Progress */}
                    <div>
                        <h3 className="font-semibold mb-2">KPI Progress</h3>
                        <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                            <div
                                className="bg-blue-600 h-3 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {currentValue} / {target} {unit} ({progress}%)
                        </p>
                    </div>

                    {/* Summary */}
                    <div>
                        <h3 className="font-semibold mb-2">Progress Summary</h3>
                        <p className="text-muted-foreground whitespace-pre-line">
                            {report.summary}
                        </p>
                    </div>

                    {/* Challenges */}
                    <div>
                        <h3 className="font-semibold mb-2">Challenges & Issues</h3>
                        <p className="text-muted-foreground whitespace-pre-line">
                            {report.challenges || 'None reported.'}
                        </p>
                    </div>

                    {/* Next Steps */}
                    <div>
                        <h3 className="font-semibold mb-2">Next Steps</h3>
                        <p className="text-muted-foreground whitespace-pre-line">
                            {report.nextSteps || 'None reported.'}
                        </p>
                    </div>
                    {/* Admin Feedback Section */}
                    {report.feedback && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded p-4 mt-6">
                            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Admin Feedback</h3>
                            <p className="text-yellow-700 whitespace-pre-line">{report.feedback}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default ReportDetails;