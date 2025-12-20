import api from '@/api';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    RadialLinearScale,
    Tooltip
} from 'chart.js'; // ✅ Chart.js (Tiada Target di sini)

import { motion } from "framer-motion";

import {
    Activity,
    AlertCircle,
    BarChart3,
    BookOpen,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock,
    Layers,
    Lightbulb,
    PieChart,
    Radar,
    ScrollText,
    ShieldAlert,
    Target, // ✅ BETUL: Target mesti duduk dalam lucide-react
    TrendingUp,
    Users,
    Waypoints
} from "lucide-react";
import { useCallback, useEffect, useState } from 'react';
import { Bar, Doughnut, Line, Radar as RadarChart } from 'react-chartjs-2';

// Register ChartJS
ChartJS.register(
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    RadialLinearScale,
    Filler,
    Tooltip,
    Legend
);

// --- KOMPONEN KAD KECIL (Untuk Hierarchy) ---
const CompactStatItem = ({ label, value, icon: Icon, color }) => (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-white`}>
            <Icon className="h-5 w-5 text-current" />
        </div>
        <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">{value}</h4>
        </div>
    </div>
);

// --- KOMPONEN KAD UTAMA (Top Row) ---
const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
        <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900 group h-full">
            <CardContent className="p-6 flex items-center justify-between relative overflow-hidden">
                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 transition-transform group-hover:scale-110 ${color}`}></div>
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</h3>
                    <p className="text-xs text-slate-400 mt-1">{subtext}</p>
                </div>
                <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-white shadow-sm`}>
                    <Icon className="h-6 w-6 text-current" />
                </div>
            </CardContent>
        </Card>
    </motion.div>
);

function DashboardOverview() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const [stats, setStats] = useState({
        totalUsers: 0,
        totalSchools: 142,
        auditLogCount: 'Live',
        pendingActions: 3,
        policies: 0,
        teras: 0,
        strategies: 0,
        initiatives: 0
    });

    const [activities, setActivities] = useState([]);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
            setUser(storedUser);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;

        try {
            const token = localStorage.getItem('authToken');
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Fetch Hierarchy Data
            let hierarchyCounts = { policies: 0, teras: 0, strategies: 0, initiatives: 0 };
            try {
                const treeRes = await api.get('/tree/initiatives', { headers });
                if (treeRes.data && treeRes.data.totals) {
                    hierarchyCounts = treeRes.data.totals;
                }
            } catch (err) { console.warn(err); }

            // 2. Fetch User & Logs
            if (user.role === 'Admin') {
                let userCount = 0;
                try {
                    const usersRes = await api.get('/users', { headers });
                    userCount = usersRes.data.length;
                } catch (e) { userCount = 12; }

                try {
                    const auditRes = await api.get('/logs?limit=6', { headers });
                    setActivities(auditRes.data.logs || []);
                } catch (e) { console.error(e); }

                setStats(prev => ({
                    ...prev,
                    totalUsers: userCount,
                    policies: hierarchyCounts.policies,
                    teras: hierarchyCounts.teras,
                    strategies: hierarchyCounts.strategies,
                    initiatives: hierarchyCounts.initiatives
                }));

            } else {
                setStats(prev => ({
                    ...prev,
                    totalUsers: 0,
                    initiatives: hierarchyCounts.initiatives
                }));
                setActivities([
                    { action: 'Laporan', details: 'Laporan bulanan dihantar', timestamp: new Date() }
                ]);
            }

        } catch (error) {
            console.error("Dashboard Error:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
            const interval = setInterval(fetchDashboardData, 30000);
            return () => clearInterval(interval);
        }
    }, [user, fetchDashboardData]);

    // --- CHART OPTIONS ---
    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false } },
            y: { border: { dash: [4, 4] }, grid: { color: '#f1f5f9' }, ticks: { padding: 10 } }
        }
    };

    const lineData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Trend', data: [12, 19, 15, 25, 22, 30],
            fill: true, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', tension: 0.4
        }]
    };

    // Dummy Data
    const barData = {
        labels: ['Utara', 'Selatan', 'Timur', 'Tengah', 'Borneo'],
        datasets: [{ label: 'Penyertaan', data: [65, 59, 80, 81, 56], backgroundColor: '#3b82f6', borderRadius: 4 }]
    };
    const doughnutData = {
        labels: ['Admin', 'PPD', 'JPN', 'Sekolah'],
        datasets: [{ data: [12, 19, 3, 5], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#64748b'], borderWidth: 0 }]
    };
    const hBarData = {
        labels: ['Bangsar', 'Kinta U.', 'JB', 'Petaling', 'Kuantan'],
        datasets: [{ label: 'Markah', data: [95, 88, 75, 72, 60], backgroundColor: '#10b981', borderRadius: 4 }]
    };
    const radarData = {
        labels: ['Sains', 'Teknologi', 'Kejuteraan', 'Matematik', 'TVET', 'Digital'],
        datasets: [{ label: 'Skor', data: [85, 70, 75, 90, 65, 80], backgroundColor: 'rgba(139, 92, 246, 0.2)', borderColor: '#8b5cf6' }]
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="text-slate-500 text-sm animate-pulse">Memuatkan dashboard...</p>
            </div>
        );
    }

    const isAdmin = user?.role === 'Admin';

    return (
        <motion.div
            className="space-y-6 p-1"
            initial="hidden" animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {isAdmin ? "Dashboard Pentadbir" : `Hai, ${user?.firstName}!`}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {isAdmin ? "Ringkasan eksekutif dan analitik sistem." : "Ringkasan tugasan anda."}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300">
                    <CalendarDays className="h-4 w-4 text-blue-500" />
                    <span>{new Date().toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
            </div>

            {/* --- SECTION 1: TOP KEY METRICS (4 KAD UTAMA) --- */}
            {/* Ini untuk data paling kritikal yang perlu dilihat serta merta */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isAdmin ? (
                    <>
                        <StatCard title="Pengguna Sistem" value={stats.totalUsers} icon={Users} color="bg-blue-500 text-blue-600" subtext="Akaun aktif berdaftar" />
                        <StatCard title="Sekolah Terlibat" value={stats.totalSchools} icon={Building2} color="bg-emerald-500 text-emerald-600" subtext="Enrolmen seluruh negara" />
                        <StatCard title="Jejak Audit" value={stats.auditLogCount} icon={ShieldAlert} color="bg-purple-500 text-purple-600" subtext="Pemantauan masa nyata" />
                        <StatCard title="Tindakan Tertunda" value={stats.pendingActions} icon={AlertCircle} color="bg-red-500 text-red-600" subtext="Isu perlu perhatian" />
                    </>
                ) : (
                    <>
                        <StatCard title="Inisiatif Saya" value={stats.initiatives} icon={BookOpen} color="bg-blue-500 text-blue-600" subtext="Tugasan aktif" />
                        <StatCard title="Laporan Selesai" value="12" icon={CheckCircle2} color="bg-emerald-500 text-emerald-600" subtext="Bulan ini" />
                        <StatCard title="Dalam Proses" value="2" icon={Activity} color="bg-amber-500 text-amber-600" subtext="Status semasa" />
                        <StatCard title="Lewat" value="0" icon={Clock} color="bg-red-500 text-red-600" subtext="Perlu tindakan" />
                    </>
                )}
            </div>

            {/* --- SECTION 2: ANALYTICS COCKPIT (GABUNGAN GRAF & DATA STRUKTUR) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 2A. GRAF UTAMA (Mengambil ruang 2/3) */}
                <motion.div className="lg:col-span-2" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                    <Card className="h-full shadow-sm border-none bg-white dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                {isAdmin ? "Trend Pelaporan Nasional" : "Prestasi Saya"}
                            </CardTitle>
                            <CardDescription>Analisis penghantaran laporan dalam tempoh 6 bulan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[320px] w-full">
                                <Line data={lineData} options={baseOptions} />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 2B. DATA STRUKTUR (Mengambil ruang 1/3 di sebelah kanan graf) */}
                {/* Ini menggantikan baris ke-2 yang semak tadi. Ia nampak seperti panel info. */}
                <motion.div className="lg:col-span-1" variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}>
                    <Card className="h-full shadow-sm border-none bg-white dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <Layers className="h-5 w-5 text-indigo-500" /> Struktur Data
                            </CardTitle>
                            <CardDescription>Ringkasan hierarki data sistem.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Grid Kecil di dalam Kad Kanan */}
                            <CompactStatItem
                                label="Dasar & Polisi"
                                value={stats.policies}
                                icon={ScrollText}
                                color="bg-indigo-500 text-indigo-600"
                            />
                            <CompactStatItem
                                label="Teras Strategik"
                                value={stats.teras}
                                icon={Target}
                                color="bg-teal-500 text-teal-600"
                            />
                            <CompactStatItem
                                label="Pelan Strategi"
                                value={stats.strategies}
                                icon={Waypoints}
                                color="bg-cyan-500 text-cyan-600"
                            />
                            <CompactStatItem
                                label="Inisiatif Program"
                                value={stats.initiatives}
                                icon={Lightbulb}
                                color="bg-orange-500 text-orange-600"
                            />
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* --- SECTION 3: DETAILED METRICS (AUDIT & MINI CHARTS) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 3A. AUDIT LOG (Kiri) */}
                <motion.div className="lg:col-span-1" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                    <Card className="h-full shadow-sm border-none bg-white dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <Activity className="h-5 w-5 text-orange-500 animate-pulse" /> Aktiviti Terkini
                            </CardTitle>
                            <CardDescription>
                                {isAdmin ? "Log aktiviti pengguna sistem." : "Garis masa tugasan anda."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6 relative pl-2 overflow-y-auto max-h-[400px] custom-scrollbar">
                                <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-slate-100 dark:bg-slate-800"></div>
                                {activities.map((log, index) => {
                                    const userName = log.performedBy?.firstName || log.user?.firstName || "Sistem";
                                    const description = log.details || log.description || "";
                                    return (
                                        <div key={index} className="relative flex items-start gap-4 group">
                                            <div className="absolute left-[15px] mt-1.5 h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white dark:ring-slate-900 group-hover:bg-blue-500 transition-colors z-10"></div>
                                            <div className="pl-12 w-full">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase">{log.action}</p>
                                                    <span className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                                    <span className="font-medium text-blue-600">{userName}</span> {description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 3B. 4 MINI CHARTS (Kanan - Grid 2x2) */}
                <motion.div className="lg:col-span-2" variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                        <Card className="shadow-sm border-none bg-white dark:bg-slate-900">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex gap-2"><BarChart3 className="h-4 w-4 text-blue-500" /> Prestasi Zon</CardTitle></CardHeader>
                            <CardContent><div className="h-[140px]"><Bar data={barData} options={baseOptions} /></div></CardContent>
                        </Card>
                        <Card className="shadow-sm border-none bg-white dark:bg-slate-900">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex gap-2"><PieChart className="h-4 w-4 text-emerald-500" /> Pengguna</CardTitle></CardHeader>
                            <CardContent><div className="h-[140px] flex justify-center"><Doughnut data={doughnutData} options={{ cutout: '70%', plugins: { legend: { display: false } } }} /></div></CardContent>
                        </Card>
                        <Card className="shadow-sm border-none bg-white dark:bg-slate-900">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex gap-2"><Layers className="h-4 w-4 text-amber-500" /> Top PPD</CardTitle></CardHeader>
                            <CardContent><div className="h-[140px]"><Bar data={hBarData} options={{ ...baseOptions, indexAxis: 'y' }} /></div></CardContent>
                        </Card>
                        <Card className="shadow-sm border-none bg-white dark:bg-slate-900">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex gap-2"><Radar className="h-4 w-4 text-purple-500" /> Domain STEM</CardTitle></CardHeader>
                            <CardContent><div className="h-[140px]"><RadarChart data={radarData} options={{ plugins: { legend: { display: false } }, scales: { r: { ticks: { display: false } } } }} /></div></CardContent>
                        </Card>
                    </div>
                </motion.div>

            </div>
        </motion.div>
    );
}

export default DashboardOverview;
//versi last commit