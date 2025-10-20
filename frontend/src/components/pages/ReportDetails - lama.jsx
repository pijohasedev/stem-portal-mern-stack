import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

function ReportDetails() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const { id } = useParams(); // Ambil report ID dari URL

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await api.get(`/reports/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                setReport(response.data);
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

    // 🔹 Calculate progress safely
    const currentValue = report.initiative?.kpi?.currentValue || 0;
    const target = report.initiative?.kpi?.target || 0;
    const unit = report.initiative?.kpi?.unit || '';
    const progress = target > 0 ? Math.min((currentValue / target) * 100, 100).toFixed(1) : 0;

    // 🔹 Badge color logic (same as ReportHistory)
    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
            case 'Needs Revision':
                return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
            case 'Pending Review':
            default:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <Link
                to="/report-history"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Report History
            </Link>

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
                </CardContent>
            </Card>
        </div>
    );
}

export default ReportDetails;
