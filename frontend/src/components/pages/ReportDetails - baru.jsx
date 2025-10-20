import api from '@/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

function ReportDetails() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    // Detect source route (from OwnerDashboard or ReportHistory)
    const fromOwnerDashboard = location.state?.from === 'owner-dashboard';

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await api.get(`/reports/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setReport(response.data);
            } catch (error) {
                console.error('Failed to fetch report details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [id]);

    if (loading) return <p className="text-center text-muted-foreground">Loading report details...</p>;
    if (!report) return <p className="text-center text-destructive">Report not found.</p>;

    return (
        <div>
            {/* 🔙 Back Button */}
            <button
                onClick={() =>
                    navigate(fromOwnerDashboard ? '/owner-dashboard' : '/report-history')
                }
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                {fromOwnerDashboard ? 'Back to Owner Dashboard' : 'Back to Report History'}
            </button>

            {/* Existing card content here */}
            <div className="bg-card rounded-lg border p-6 shadow-sm">
                <h2 className="text-2xl font-bold mb-2">
                    {report.initiative?.name || 'N/A'} - {report.period}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Submitted on {new Date(report.createdAt).toLocaleDateString()}
                </p>

                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Progress Summary</h3>
                        <p className="text-muted-foreground">{report.summary}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Challenges & Issues</h3>
                        <p className="text-muted-foreground">{report.challenges || 'None reported.'}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Next Steps</h3>
                        <p className="text-muted-foreground">{report.nextSteps || 'None reported.'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReportDetails;

