import api from '@/api';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SubmitReport from './SubmitReport'; // We are reusing the submit report form

function EditReport() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const { id } = useParams(); // Gets the report ID from the URL
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await api.get(`/reports/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                setReport(response.data);
            } catch (error) {
                console.error("Failed to fetch report for editing:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [id]);

    const handleReportResubmitted = () => {
        // After resubmitting, navigate the user back to their report history
        navigate('/report-history');
    };

    if (loading) {
        return <p className="text-center text-muted-foreground">Loading report data...</p>;
    }

    if (!report) {
        return <p className="text-center text-destructive">Could not load the report for editing.</p>;
    }

    return (
        <SubmitReport
            reportToEdit={report}
            onReportSubmitted={handleReportResubmitted}
        />
    );
}

export default EditReport;