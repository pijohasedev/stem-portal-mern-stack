import api from '@/api';
import { Badge } from "@/components/ui/badge"; // Assuming you have a Badge component
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Pencil } from 'lucide-react'; // Icons for buttons
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function MyReports() {
    // State to hold the list of reports
    const [reports, setReports] = useState([]);
    // State to manage loading status
    const [isLoading, setIsLoading] = useState(true);
    // Hook for programmatic navigation
    const navigate = useNavigate();

    // useEffect hook to fetch data when the component mounts
    useEffect(() => {
        const fetchMyReports = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await api.get('/reports/my-reports', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setReports(res.data); // Store the fetched reports in state
            } catch (error) {
                console.error("Failed to fetch reports:", error);
                // Optionally, show an error message to the user
            } finally {
                setIsLoading(false); // Stop loading, whether successful or not
            }
        };

        fetchMyReports();
    }, []); // The empty dependency array [] means this runs only once on mount

    // Function to determine badge color based on status
    const getStatusVariant = (status) => {
        switch (status) {
            case 'Approved':
                return 'success'; // Or your theme's equivalent
            case 'Needs Revision':
                return 'destructive';
            case 'Pending Review':
            default:
                return 'secondary';
        }
    };

    if (isLoading) {
        return <div>Loading your reports...</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">My Report History</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Submitted Reports</CardTitle>
                    <CardDescription>A list of all the progress reports you have submitted.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Initiative</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Date Submitted</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.length > 0 ? (
                                reports.map(report => (
                                    <TableRow key={report._id}>
                                        {/* Initiative name is populated from the backend */}
                                        <TableCell>{report.initiative.name}</TableCell>
                                        <TableCell>{report.period}</TableCell>
                                        {/* Formatting the date to be more readable */}
                                        <TableCell>{new Date(report.reportDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {/* Navigate to a detailed view page */}
                                            <Button variant="outline" size="icon" onClick={() => navigate(`/report/${report._id}`)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {/* Conditionally show Edit button */}
                                            {report.status === 'Needs Revision' && (
                                                <Button variant="outline" size="icon" onClick={() => navigate(`/edit-report/${report._id}`)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan="5" className="text-center">You have not submitted any reports yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default MyReports;