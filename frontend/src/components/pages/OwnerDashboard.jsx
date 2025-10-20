import api from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PlanInitiativeModal from './PlanInitiativeModal';

function OwnerDashboard() {
    const navigate = useNavigate();
    const [initiatives, setInitiatives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedInitiative, setSelectedInitiative] = useState(null);
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const preselectedInitiativeId = queryParams.get('initiativeId');

    //const handleViewDetails = (initiativeId) => {
    //    navigate(`/report/${initiativeId}`);
    //};

    const handleViewDetails = async (initiativeId) => {
        try {
            const token = localStorage.getItem('authToken');

            // 🔹 Panggil endpoint baru: cari report terkini bagi inisiatif
            const res = await api.get(`/reports/by-initiative/${initiativeId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.data && res.data._id) {
                // ✅ Kalau ada report, navigate ke paparan details
                navigate(`/report/${res.data._id}`, { state: { from: 'owner-dashboard' } });
            } else {
                // ⚠️ Kalau tiada report lagi
                Swal.fire({
                    title: 'No Report Found',
                    text: 'This initiative has no submitted reports yet.',
                    icon: 'info',
                });
            }
        } catch (error) {
            console.error("Error fetching latest report:", error);
            Swal.fire('Error', 'Failed to load report details', 'error');
        }
    };



    const handleSubmitReport = (initiativeId) => {
        navigate(`/submit-report?initiativeId=${initiativeId}`);
    };


    const fetchInitiatives = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await api.get('/users/me/initiatives', {  // ✅ gunakan endpoint owner-specific
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const data = response.data || [];
            console.log("Fetched initiatives:", data);
            setInitiatives(data);
        } catch (error) {
            console.error("Failed to fetch owner initiatives:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitiatives();
    }, [fetchInitiatives]);




    const handleOpenPlanModal = (initiative) => {
        setSelectedInitiative(initiative);
        setIsPlanModalOpen(true);
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'Active':
                return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
            case 'Planning':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
            case 'At Risk':
                return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
            case 'Completed':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
            default: // Pending Acceptance
                return 'bg-gray-100 text-gray-800 dark:bg-secondary dark:text-secondary-foreground';
        }
    };

    if (loading) {
        return <p className="text-center text-muted-foreground">Loading your initiatives...</p>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4 text-foreground">My Initiatives</h1>

            {initiatives.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {initiatives.map(initiative => {
                        const kpiProgress = initiative.kpi.target > 0
                            ? Math.round(((initiative.kpi.currentValue || 0) / initiative.kpi.target) * 100)
                            : 0;

                        return (
                            <Card key={initiative._id} className="flex flex-col justify-between border-border">
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-2">
                                        <CardTitle className="text-base font-semibold truncate" title={initiative.name}>
                                            {initiative.name}
                                        </CardTitle>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${getStatusStyles(initiative.status)}`}>
                                            {initiative.status}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col justify-center items-start flex-1">
                                    <div className="flex items-start gap-2">
                                        {/* Nilai KPI */}
                                        <p className="text-5xl font-bold text-blue-900 leading-none">
                                            {initiative.kpi.currentValue || 0}
                                        </p>

                                        {/* Unit + baki KPI */}
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-base font-medium text-muted-foreground">
                                                {initiative.kpi.unit}
                                            </span>
                                            {(() => {
                                                const current = initiative.kpi.currentValue || 0;
                                                const target = initiative.kpi.target || 0;
                                                const balance = target - current;
                                                const isNegative = balance > 0; // Masih belum capai
                                                const balanceText = isNegative ? `-${balance}` : `+${Math.abs(balance)}`;
                                                return (
                                                    <span
                                                        className={`text-sm font-semibold ${isNegative ? "text-red-600" : "text-green-600"
                                                            }`}
                                                    >
                                                        {balanceText}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Target */}
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Target: {initiative.kpi.target} {initiative.kpi.unit}
                                    </p>
                                </CardContent>


                                <div className="p-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">Progress</span>
                                        {/*<span className="font-medium">{kpiProgress}%</span>*/}
                                        <span className="font-medium">{kpiProgress > 100 ? '100+' : kpiProgress}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${kpiProgress > 99 ? 'bg-green-500' : 'bg-primary'}`}
                                            style={{ width: `${Math.min(kpiProgress, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="p-4 border-t border-border flex justify-end gap-2">
                                    {initiative.status === 'Pending Acceptance' ? (
                                        <Button onClick={() => handleOpenPlanModal(initiative)} className="w-full">Accept Initiative</Button>
                                    ) : (
                                        <>
                                            <Button variant="outline" onClick={() => handleViewDetails(initiative._id)}>Details</Button>
                                            <Button onClick={() => handleSubmitReport(initiative._id)}>Submit Report</Button>
                                        </>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-card rounded-lg border">
                    <p className="text-muted-foreground">You have not been assigned any initiatives yet.</p>
                </div>
            )}

            <PlanInitiativeModal
                initiative={selectedInitiative}
                isOpen={isPlanModalOpen}
                onClose={() => setIsPlanModalOpen(false)}
                onAccepted={fetchInitiatives}
            />
        </div>
    );
}

export default OwnerDashboard;