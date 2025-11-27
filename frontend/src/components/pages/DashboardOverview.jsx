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
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip
} from 'chart.js';
import { motion } from "framer-motion";
import {
    Activity,
    BarChart3,
    CalendarDays,
    FolderKanban,
    Target,
    TrendingUp
} from "lucide-react";
import { useCallback, useEffect, useState } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

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

    // --- Configuration for Charts ---

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { family: "'Inter', sans-serif", size: 12 }
                }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 13 },
                cornerRadius: 8,
                displayColors: false,
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { family: "'Inter', sans-serif" } }
            },
            y: {
                border: { dash: [4, 4] },
                grid: { color: '#f1f5f9', drawBorder: false },
                ticks: { padding: 10 }
            }
        },
        elements: {
            line: { tension: 0.4 }, // Smooth curve
            point: { radius: 4, hoverRadius: 6, backgroundColor: '#fff', borderWidth: 2 }
        }
    };

    const doughnutData = {
        labels: ['Perancangan', 'Aktif', 'Berisiko', 'Selesai'],
        datasets: [
            {
                data: [12, 19, 3, 5],
                backgroundColor: ['#f59e0b', '#10b981', '#ef4444', '#3b82f6'], // Modern hex colors
                hoverBackgroundColor: ['#d97706', '#059669', '#dc2626', '#2563eb'],
                borderWidth: 0,
                cutout: '75%', // Thinner ring
            },
        ],
    };

    const lineData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Inisiatif Baharu',
                data: [3, 5, 6, 8, 9, 12],
                fill: true,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)'); // Blue fade top
                    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)'); // Transparent bottom
                    return gradient;
                },
                borderColor: '#3b82f6',
                borderWidth: 3,
            },
        ],
    };

    // --- Component Render ---

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground text-sm animate-pulse">Memuatkan data dashboard...</p>
            </div>
        );
    }

    // Helper for stat items (Updated: Removed 'trend' data)
    const statItems = [
        {
            label: "Dasar & Polisi",
            value: stats.policies,
            icon: <FolderKanban className="h-6 w-6 text-blue-600" />,
            bg: "bg-blue-100"
        },
        {
            label: "Teras Utama",
            value: stats.teras,
            icon: <Target className="h-6 w-6 text-emerald-600" />,
            bg: "bg-emerald-100"
        },
        {
            label: "Strategi",
            value: stats.strategies,
            icon: <BarChart3 className="h-6 w-6 text-purple-600" />,
            bg: "bg-purple-100"
        },
        {
            label: "Inisiatif Aktif",
            value: stats.initiatives,
            icon: <Activity className="h-6 w-6 text-amber-600" />,
            bg: "bg-amber-100"
        },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="space-y-8 p-1"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Dashboard Overview
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Laporan pelaksanaan inisiatif pendidikan STEM.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm text-sm text-slate-600">
                    <CalendarDays className="h-4 w-4" />
                    <span>{new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statItems.map((item, i) => (
                    <motion.div key={i} variants={itemVariants}>
                        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-900">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500 mb-1">{item.label}</p>
                                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{item.value}</h3>
                                    </div>
                                    <div className={`p-3 rounded-full ${item.bg}`}>
                                        {item.icon}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                {/* Line Chart (Larger) */}
                <motion.div className="lg:col-span-4" variants={itemVariants}>
                    <Card className="h-full shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                Prestasi Inisiatif
                            </CardTitle>
                            <CardDescription>Trend inisiatif baharu dalam tempoh 6 bulan.</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-0">
                            <div className="h-[350px] w-full">
                                <Line data={lineData} options={chartOptions} />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Doughnut Chart (Smaller) */}
                <motion.div className="lg:col-span-3" variants={itemVariants}>
                    <Card className="h-full shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Activity className="h-5 w-5 text-orange-500" />
                                Status Terkini
                            </CardTitle>
                            <CardDescription>Pecahan status pelaksanaan inisiatif.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full flex items-center justify-center relative">
                                <Doughnut
                                    data={doughnutData}
                                    options={{
                                        ...chartOptions,
                                        cutout: '70%',
                                        scales: { display: false }
                                    }}
                                />
                                {/* Center Text for Doughnut */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-bold text-slate-800 dark:text-white">{stats.initiatives}</span>
                                    <span className="text-xs text-slate-500 uppercase">Total</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
}

export default DashboardOverview;