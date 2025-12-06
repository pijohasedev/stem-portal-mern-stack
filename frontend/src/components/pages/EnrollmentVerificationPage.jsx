import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, Filter, MapPin } from "lucide-react"; // Tambah Ikon Filter & MapPin
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import EnrollmentVerificationTable from './EnrollmentVerificationTable';
import VerificationModal from './VerificationModal';

function EnrollmentVerificationPage() {
    const [year, setYear] = useState("2025");
    const [month, setMonth] = useState("10");
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Modal & Sesi
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSessionOpen, setIsSessionOpen] = useState(true);
    const [sessionInfo, setSessionInfo] = useState(null);

    // ✅ NEW: Filter States (Untuk Admin)
    const [locations, setLocations] = useState({ states: [], ppds: [] });
    const [filterState, setFilterState] = useState("ALL");
    const [filterPPD, setFilterPPD] = useState("ALL");

    // 1. Load Locations (Sekali Sahaja)
    useEffect(() => {
        api.get('/enrollment/options/locations', {
            headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        }).then(res => {
            setLocations(res.data);
        }).catch(console.error);
    }, []);

    // 2. Check Session (Bila Tahun Berubah)
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

                    if (now >= start && now <= end) {
                        setIsSessionOpen(true);
                    } else {
                        setIsSessionOpen(false);
                    }
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

    // 3. Fetch Records
    const fetchRecords = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await api.get(`/enrollment/my-district?year=${year}&month=${month}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSchools(res.data);
        } catch (error) {
            console.error("Error fetching records:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [year, month]);

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

    // --- LOGIK FILTER ---
    const filteredSchools = schools.filter(item => {
        // Filter State (Check ID)
        if (filterState !== "ALL" && item.state !== filterState) return false;

        // Filter PPD (Handle populated object)
        if (filterPPD !== "ALL") {
            const ppdId = item.ppd?._id || item.ppd;
            if (ppdId !== filterPPD) return false;
        }
        return true;
    });

    // Filter PPD dropdown based on selected State
    const filteredPPDOptions = filterState === "ALL"
        ? locations.ppds
        : locations.ppds.filter(p => (p.state?._id || p.state) === filterState);

    return (
        <div className="p-6 space-y-6">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Semakan Enrolmen STEM</h1>
                    <p className="text-muted-foreground">Sahkan data enrolmen murid Tingkatan 4.</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto justify-end">

                    {/* BAR FILTER (Negeri & PPD) */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border shadow-sm">
                        <Filter className="h-4 w-4 text-slate-500 ml-2 hidden sm:block" />

                        {/* State Filter */}
                        <Select value={filterState} onValueChange={(val) => { setFilterState(val); setFilterPPD("ALL"); }}>
                            <SelectTrigger className="w-[140px] sm:w-[180px] border-none shadow-none bg-transparent focus:ring-0 h-8 text-xs sm:text-sm">
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

                        {/* PPD Filter */}
                        <Select value={filterPPD} onValueChange={setFilterPPD}>
                            <SelectTrigger className="w-[140px] sm:w-[220px] border-none shadow-none bg-transparent focus:ring-0 h-8 text-xs sm:text-sm">
                                <div className="flex items-center gap-2 truncate">
                                    <MapPin className="h-3 w-3 text-muted-foreground hidden sm:block" />
                                    <SelectValue placeholder="Semua PPD" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="ALL">Semua PPD</SelectItem>
                                {filteredPPDOptions.map(p => (
                                    <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* KAWALAN MASA (Month/Year) */}
                    <div className="flex items-center gap-2">
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="3">Mac</SelectItem>
                                <SelectItem value="6">Jun</SelectItem>
                                <SelectItem value="10">Oktober</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2025">2025</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={fetchRecords} variant="outline">Refresh</Button>
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
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-yellow-800">
                    Sesi belum dijadualkan oleh Admin.
                </div>
            )}

            {/* TABLE DATA */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center">Memuatkan data...</div>
                    ) : filteredSchools.length > 0 ? (
                        <EnrollmentVerificationTable
                            schools={filteredSchools} // Gunakan filteredSchools
                            onEdit={handleEditClick}
                            readOnly={!isSessionOpen}
                        />
                    ) : (
                        <div className="p-12 text-center text-gray-500 border-dashed">
                            <p>Tiada data enrolmen dijumpai untuk kriteria ini.</p>
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