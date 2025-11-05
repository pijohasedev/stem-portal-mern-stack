import api from '@/api';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ArcElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip
} from 'chart.js';
import { motion } from "framer-motion";
import { BarChart3, FolderKanban, Target, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

function DashboardOverview() {
    const [stats, setStats] = useState({ policies: 0, teras: 0, strategies: 0, initiatives: 0 });
    const [loading, setLoading] = useState(true);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await api.get('/tree/initiatives', { headers: { Authorization: `Bearer ${token}` } });
            setStats(response.data.totals);
        } catch (error) {
            console.error("Failed to fetch dashboard summary:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const doughnutData = {
        labels: ['Perancangan', 'Aktif', 'Berisiko', 'Selesai'],
        datasets: [
            {
                data: [12, 19, 3, 5],
                backgroundColor: ['#facc15', '#22c55e', '#ef4444', '#3b82f6'],
                borderWidth: 2,
                borderColor: '#fff'
            },
        ],
    };

    const lineData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'New Initiatives Created',
                data: [3, 5, 6, 8, 9, 12],
                fill: true,
                backgroundColor: 'rgba(59,130,246,0.1)',
                borderColor: '#2563eb',
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
        ],
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Tajuk Dashboard */}
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
                    Dashboard Overview
                </h1>
                <p className="text-muted-foreground">
                    Gambaran pelaporan pelaksanaan inisiatif pendidikan STEM oleh Kementerian Pendidikan (KPM).
                </p>
            </div>

            {/* Kad Ringkasan */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Jumlah Dasar/Polisi", value: stats.policies, color: "blue", icon: <FolderKanban className="h-6 w-6" /> },
                    { label: "Jumlah Teras", value: stats.teras, color: "green", icon: <Target className="h-6 w-6" /> },
                    { label: "Jumlah Strategi", value: stats.strategies, color: "yellow", icon: <BarChart3 className="h-6 w-6" /> },
                    { label: "Jumlah Inisiatif", value: stats.initiatives, color: "purple", icon: <TrendingUp className="h-6 w-6" /> },
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card
                            className={`border-l-4 border-${item.color}-500 hover:shadow-lg transition-all duration-300`}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                                <div className={`text-${item.color}-600`}>{item.icon}</div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{item.value}</div>
                                <p className="text-xs text-muted-foreground mt-1">Updated live</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Carta */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="lg:col-span-2"
                >
                    <Card className="hover:shadow-md transition-all duration-300">
                        <CardHeader>
                            <CardTitle>Initiatives Over Time</CardTitle>
                            <CardDescription>Monthly trend of new initiatives</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <Line data={lineData} options={{ maintainAspectRatio: false }} />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Card className="hover:shadow-md transition-all duration-300">
                        <CardHeader>
                            <CardTitle>Status Inisiatif</CardTitle>
                            <CardDescription>Kedudukan terkini mengikut fasa</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

export default DashboardOverview;
