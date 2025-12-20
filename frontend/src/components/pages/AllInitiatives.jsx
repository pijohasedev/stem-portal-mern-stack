import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    CalendarDaysIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon,
    PencilSquareIcon,
    PlusIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import {
    BookOpen,
    Layers,
    Target,
    Zap
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import AddInitiativeModal from './AddInitiativeModal';
import EditDatesModal from './EditDatesModal';

function AllInitiatives() {
    const [treeData, setTreeData] = useState([]);
    const [totals, setTotals] = useState({ policies: 0, teras: 0, strategies: 0, initiatives: 0 });
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState({});
    const [searchTerm, setSearchTerm] = useState("");

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInitiative, setEditingInitiative] = useState(null);
    const [isDatesModalOpen, setIsDatesModalOpen] = useState(false);

    const fetchTree = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await api.get('/tree/initiatives', { headers: { 'Authorization': `Bearer ${token}` } });
            setTreeData(response.data.tree);
            setTotals(response.data.totals);
        } catch (error) {
            console.error("Failed to fetch initiative tree:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTree();
    }, [fetchTree]);

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleOpenAddModal = () => {
        setEditingInitiative(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (e, initiative) => {
        e.stopPropagation();
        setEditingInitiative(initiative);
        setIsModalOpen(true);
    };

    const handleOpenDatesModal = (e, initiative) => {
        e.stopPropagation();
        setEditingInitiative(initiative);
        setIsDatesModalOpen(true);
    };

    const confirmDeleteInitiative = (e, initiative) => {
        e.stopPropagation();
        Swal.fire({
            title: 'Adakah anda pasti?',
            text: `Anda akan memadam "${initiative.name}". Tindakan ini tidak boleh dikembalikan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, padam!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteInitiative(initiative._id);
            }
        });
    };

    const deleteInitiative = async (initiativeId) => {
        try {
            const token = localStorage.getItem('authToken');
            await api.delete(`/initiatives/${initiativeId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            Swal.fire('Berjaya!', 'Inisiatif telah dipadam.', 'success');
            fetchTree();
        } catch (error) {
            Swal.fire('Ralat!', error.response?.data?.message || 'Gagal memadam inisiatif.', 'error');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            'Active': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'Planning': 'bg-blue-100 text-blue-700 border-blue-200',
            'At Risk': 'bg-red-100 text-red-700 border-red-200',
            'Completed': 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return (
            <Badge variant="outline" className={`${styles[status] || 'bg-gray-100 text-gray-600'} px-2 py-0.5 font-medium border`}>
                {status || 'Unknown'}
            </Badge>
        );
    };

    // --- RECURSIVE RENDERER ---
    const renderTreeRows = (items, type, level = 0) => {
        if (!items || items.length === 0) return null;

        return items.map(item => {
            const isExpanded = !!expandedRows[item._id];

            // Tentukan children berdasarkan jenis
            let children = [];
            let childType = '';

            if (type === 'policy') { children = item.teras || []; childType = 'teras'; }
            else if (type === 'teras') { children = item.strategies || []; childType = 'strategy'; }
            else if (type === 'strategy') { children = item.initiatives || []; childType = 'initiative'; }

            // Warna Indentasi (Visual Guide)
            const borderColors = ['border-l-blue-500', 'border-l-emerald-500', 'border-l-amber-500', 'border-l-purple-500'];
            const levelClass = level > 0 ? `border-l-2 ${borderColors[level - 1] || 'border-l-gray-300'}` : '';

            // Row Content
            const rowContent = (
                <div
                    className={`
                        grid grid-cols-12 gap-4 py-3 px-4 items-center border-b transition-colors
                        ${type !== 'initiative' ? 'cursor-pointer hover:bg-slate-50' : 'bg-white hover:bg-slate-50/50'}
                        ${level === 0 ? 'bg-slate-50/50' : ''}
                    `}
                    onClick={type !== 'initiative' ? () => toggleRow(item._id) : undefined}
                    style={{ paddingLeft: `${level * 24 + 16}px` }}
                >
                    {/* COL 1: NAME & ICON */}
                    <div className="col-span-6 flex items-center gap-3">
                        {type !== 'initiative' && (
                            <div className="text-slate-400">
                                {children.length > 0 ? (
                                    isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />
                                ) : <div className="w-4" />}
                            </div>
                        )}

                        {/* Type Icon */}
                        {type === 'initiative' && <div className="w-4" />} {/* Spacer for initiative */}

                        <div className="flex flex-col">
                            <span className={`text-sm ${type === 'policy' ? 'font-bold text-slate-800 uppercase tracking-wide' : type === 'initiative' ? 'font-medium text-slate-700' : 'font-semibold text-slate-700'}`}>
                                {type === 'policy' && <span className="text-xs text-blue-600 mr-2">DASAR</span>}
                                {type === 'teras' && <span className="text-xs text-emerald-600 mr-2">TERAS</span>}
                                {type === 'strategy' && <span className="text-xs text-amber-600 mr-2">STRATEGI</span>}
                                {item.name}
                            </span>
                        </div>
                    </div>

                    {/* COL 2: ASSIGNEES (Initiative Only) */}
                    <div className="col-span-2 text-sm text-slate-500">
                        {type === 'initiative' && item.assignees?.length > 0 && (
                            <div className="flex -space-x-2 overflow-hidden">
                                {item.assignees.slice(0, 3).map((u, i) => (
                                    // ✅ FIX DI SINI: Buang 'inline-block', kekalkan 'flex'
                                    <div key={i} className="h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600" title={u.firstName}>
                                        {u.firstName?.[0]}
                                    </div>
                                ))}
                                {item.assignees.length > 3 && (
                                    // ✅ FIX DI SINI: Buang 'inline-block', kekalkan 'flex'
                                    <div className="h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                                        +{item.assignees.length - 3}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* COL 3: STATUS & KPI */}
                    <div className="col-span-2 flex items-center gap-3">
                        {type === 'initiative' && (
                            <>
                                {getStatusBadge(item.status)}
                                <span className="text-xs text-slate-500 font-mono">
                                    {item.kpi?.currentValue || 0}/{item.kpi?.target}
                                </span>
                            </>
                        )}
                    </div>

                    {/* COL 4: ACTIONS */}
                    <div className="col-span-2 flex justify-end gap-1">
                        {type === 'initiative' && (
                            <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={(e) => handleOpenEditModal(e, item)}>
                                    <PencilSquareIcon className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-amber-600" onClick={(e) => handleOpenDatesModal(e, item)}>
                                    <CalendarDaysIcon className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={(e) => confirmDeleteInitiative(e, item)}>
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            );

            return (
                <div key={item._id} className={levelClass}>
                    {rowContent}
                    {isExpanded && children.length > 0 && (
                        <div className="animate-in slide-in-from-top-1 duration-200">
                            {renderTreeRows(children, childType, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
                <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
                <div className="h-4 w-48 bg-slate-200 rounded"></div>
                <p className="mt-2 text-slate-400">Memuatkan Pelan Strategik...</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Senarai Inisiatif</h1>
                    <p className="text-slate-500 mt-1">Uruskan struktur pelan strategik, dasar, teras, dan inisiatif.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cari..."
                            className="pl-9 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleOpenAddModal} className="bg-blue-600 hover:bg-blue-700">
                        <PlusIcon className="h-5 w-5 mr-1" /> Baru
                    </Button>
                </div>
            </div>

            {/* --- STATS CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Dasar/Polisi</CardTitle>
                        <BookOpen className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totals.policies}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Teras Strategik</CardTitle>
                        <Layers className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totals.teras}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Strategi</CardTitle>
                        <Target className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totals.strategies}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Inisiatif</CardTitle>
                        <Zap className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totals.initiatives}</div>
                    </CardContent>
                </Card>
            </div>

            {/* --- MAIN TREE TABLE --- */}
            <Card className="border shadow-sm overflow-hidden">
                <div className="bg-slate-100 border-b px-4 py-3 grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-6">Struktur Pelan</div>
                    <div className="col-span-2">Pegawai</div>
                    <div className="col-span-2">Status / KPI</div>
                    <div className="col-span-2 text-right">Tindakan</div>
                </div>

                <div className="bg-white min-h-[300px]">
                    {treeData.length > 0 ? (
                        renderTreeRows(treeData, 'policy')
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Layers className="h-12 w-12 mb-3 opacity-20" />
                            <p>Tiada data pelan strategik.</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* --- MODALS --- */}
            <AddInitiativeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onInitiativeAdded={fetchTree}
                initiativeToEdit={editingInitiative}
            />
            <EditDatesModal
                initiative={editingInitiative}
                isOpen={isDatesModalOpen}
                onClose={() => setIsDatesModalOpen(false)}
                onDatesUpdated={fetchTree}
            />
        </div>
    );
}

export default AllInitiatives;