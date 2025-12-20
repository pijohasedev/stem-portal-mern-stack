import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, Filter, MapPin } from "lucide-react";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import EnrollmentVerificationTable from './EnrollmentVerificationTable';
import VerificationModal from './VerificationModal';

function EnrollmentVerificationPage() {
    // State Tarikh
    const [year, setYear] = useState("2025");
    const [month, setMonth] = useState("10"); // Default bulan Oktober (contoh)

    // State Data
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);

    // State Modal & Sesi
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSessionOpen, setIsSessionOpen] = useState(true);
    const [sessionInfo, setSessionInfo] = useState(null);

    // ✅ Filter States (Admin & JPN)
    const [locations, setLocations] = useState({ states: [], ppds: [] }); // Untuk Admin (Semua data)
    const [jpnPPDList, setJpnPPDList] = useState([]); // ✅ Untuk JPN (PPD negeri dia shj)

    const [filterState, setFilterState] = useState("ALL");
    const [filterPPD, setFilterPPD] = useState("ALL");

    // 1. Load User & Locations
    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userData = JSON.parse(userStr);
                setUser(userData);

                const token = localStorage.getItem('authToken');

                // A. JIKA ADMIN: Tarik semua Negeri & PPD
                if (userData.role === 'Admin') {
                    api.get('/enrollment/options/locations', {
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(res => {
                        setLocations(res.data);
                    }).catch(console.error);
                }
                // B. ✅ JIKA JPN (Negeri): Tarik PPD negeri dia sahaja
                else if (userData.role === 'Negeri') {
                    // Pastikan kita ada ID state
                    const stateId = typeof userData.state === 'object' ? userData.state._id : userData.state;

                    if (stateId) {
                        api.get(`/ppds?state=${stateId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        }).then(res => {
                            setJpnPPDList(res.data);
                        }).catch(console.error);
                    }
                }
            }
        } catch (e) {
            console.error("Error reading user role", e);
        }
    }, []);

    // 2. Check Session
    useEffect(() => {
        const checkSession = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await api.get(`/enrollment/settings/${year}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const settings = res.data;
                if (settings) {
                    setSessionInfo({
                        start: new Date(settings.verifyStartDate),
                        end: new Date(settings.verifyEndDate)
                    });

                    const now = new Date();
                    const start = new Date(settings.verifyStartDate);
                    const end = new Date(settings.verifyEndDate);
                    end.setHours(23, 59, 59, 999);

                    setIsSessionOpen(now >= start && now <= end);
                } else {
                    setIsSessionOpen(false);
                    setSessionInfo(null);
                }

            } catch (error) {
                console.error("Error checking session:", error);
                setIsSessionOpen(false);
            }
        };
        checkSession();
    }, [year]);

    // 3. Fetch Records (Main Logic)
    const fetchRecords = async () => {
        if (!user) return; // Tunggu user load dulu

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');

            // ✅ Guna route universal '/verify' 
            // Backend akan handle logic ikut role (Admin/JPN/PPD)
            let url = `/enrollment/verify?year=${year}&month=${month}`;

            // Tambah parameter filter jika ada (Untuk Admin & JPN)
            if (filterPPD !== "ALL") {
                url += `&ppd=${filterPPD}`;
            }

            // Filter State (Hanya Admin boleh guna ini)
            if (user.role === 'Admin' && filterState !== "ALL") {
                url += `&state=${filterState}`;
            }

            const res = await api.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSchools(res.data);
        } catch (error) {
            console.error("Error fetching records:", error);
        } finally {
            setLoading(false);
        }
    };

    // Reload bila filter berubah
    useEffect(() => {
        fetchRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month, filterState, filterPPD, user]);

    // --- HANDLERS ---
    const handleEditClick = (school) => {
        setSelectedSchool(school);
        setIsModalOpen(true);
    };

    const handleSaveVerification = async (id, data) => {
        try {
            const token = localStorage.getItem('authToken');
            await api.put(`/enrollment/${id}/verify`, { verifiedData: data }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire("Berjaya", "Data telah disahkan!", "success");
            fetchRecords();
        } catch (error) {
            Swal.fire("Ralat", error.response?.data?.message || "Gagal menyimpan.", "error");
        }
    };

    const formatDate = (dateObj) => {
        return dateObj ? dateObj.toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
    };

    // Filter PPD options for Admin (based on selected state)
    const adminPPDOptions = filterState === "ALL"
        ? locations.ppds
        : locations.ppds.filter(p => (p.state?._id || p.state) === filterState);

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Semakan Enrolmen STEM</h1>
                    <p className="text-muted-foreground">Sahkan data enrolmen murid Tingkatan 4.</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto justify-end">

                    {/* ✅ FILTER BLOCK: ADMIN */}
                    {user?.role === 'Admin' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border shadow-sm">
                            <Filter className="h-4 w-4 text-slate-500 ml-2 hidden sm:block" />

                            {/* State Filter */}
                            <Select value={filterState} onValueChange={(val) => { setFilterState(val); setFilterPPD("ALL"); }}>
                                <SelectTrigger className="w-[140px] border-none shadow-none bg-transparent focus:ring-0 h-8 text-xs sm:text-sm">
                                    <SelectValue placeholder="Semua Negeri" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Negeri</SelectItem>
                                    {locations.states.map(s => (
                                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

                            {/* PPD Filter (Admin) */}
                            <Select value={filterPPD} onValueChange={setFilterPPD}>
                                <SelectTrigger className="w-[180px] border-none shadow-none bg-transparent focus:ring-0 h-8 text-xs sm:text-sm">
                                    <SelectValue placeholder="Semua PPD" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua PPD</SelectItem>
                                    {adminPPDOptions.map(p => (
                                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* ✅ FILTER BLOCK: JPN / NEGERI (BARU) */}
                    {user?.role === 'Negeri' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border shadow-sm">
                            <MapPin className="h-4 w-4 text-slate-500 ml-2 hidden sm:block" />

                            {/* PPD Filter (JPN Sahaja) */}
                            <Select value={filterPPD} onValueChange={setFilterPPD}>
                                <SelectTrigger className="w-[200px] border-none shadow-none bg-transparent focus:ring-0 h-8 text-xs sm:text-sm">
                                    <SelectValue placeholder="Semua PPD" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua PPD</SelectItem>
                                    {jpnPPDList.map(p => (
                                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* KAWALAN MASA (Semua Role) */}
                    <div className="flex items-center gap-2">
                        <Select value={month.toString()} onValueChange={setMonth}>
                            <SelectTrigger className="w-[110px] bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {[...Array(12)].map((_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                                        {new Date(0, i).toLocaleString('ms-MY', { month: 'long' })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={year.toString()} onValueChange={setYear}>
                            <SelectTrigger className="w-[90px] bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2025">2025</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={fetchRecords} variant="outline" size="icon">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* BANNER SESI */}
            {sessionInfo ? (
                <div className={`border-l-4 p-4 rounded shadow-sm flex items-center justify-between ${isSessionOpen ? 'bg-blue-50 border-blue-500' : 'bg-red-50 border-red-500'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isSessionOpen ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className={`font-bold ${isSessionOpen ? 'text-blue-800' : 'text-red-800'}`}>
                                {isSessionOpen ? "Sesi Semakan Sedang Dibuka" : "Sesi Semakan Ditutup"}
                            </h3>
                            <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                                <CalendarDays className="h-4 w-4" />
                                Tarikh: <b>{formatDate(sessionInfo.start)}</b> hingga <b>{formatDate(sessionInfo.end)}</b>
                            </p>
                        </div>
                    </div>
                    {isSessionOpen && <Badge className="bg-green-600">AKTIF</Badge>}
                </div>
            ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-yellow-800 flex items-center gap-3">
                    <Clock className="h-5 w-5" />
                    <span>Sesi belum dijadualkan oleh Admin.</span>
                </div>
            )}

            {/* TABLE DATA */}
            <Card className="border-none shadow-md">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Memuatkan data enrolmen...</div>
                    ) : schools.length > 0 ? (
                        <EnrollmentVerificationTable
                            schools={schools}
                            onEdit={handleEditClick}
                            readOnly={!isSessionOpen}
                        />
                    ) : (
                        <div className="p-16 text-center text-gray-500 border-dashed bg-slate-50/50">
                            <MapPin className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                            <p>Tiada data sekolah dijumpai untuk kriteria ini.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <VerificationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                school={selectedSchool}
                onSave={handleSaveVerification}
            />
        </div>
    );
}

export default EnrollmentVerificationPage;