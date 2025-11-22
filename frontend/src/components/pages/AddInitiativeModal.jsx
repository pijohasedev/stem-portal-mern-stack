import api from '@/api';
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

// Komponen helper untuk memaparkan nama (kita akan gunakannya nanti)
const UserDisplay = ({ user }) => {
    let location = '';
    if (user.role === 'Negeri' && user.state) {
        location = `(${user.state.name})`;
    } else if (user.role === 'PPD' && user.ppd) {
        location = `(${user.ppd.name})`;
    } else if (user.role === 'Bahagian' && user.department) {
        location = `(${user.department})`;
    }
    return `${user.firstName} ${user.lastName} ${location}`.trim();
};


function AddInitiativeModal({ isOpen, onClose, onInitiativeAdded, initiativeToEdit }) {
    // State untuk data dropdown (Lookup)
    const [policies, setPolicies] = useState([]);
    const [terasItems, setTerasItems] = useState([]);
    const [strategies, setStrategies] = useState([]);
    const [states, setStates] = useState([]);
    const [ppds, setPpds] = useState([]);
    const [users, setUsers] = useState([]); // Untuk tugasan individu

    // State untuk borang
    const [selectedPolicy, setSelectedPolicy] = useState('');
    const [selectedTeras, setSelectedTeras] = useState('');
    const [selectedStrategy, setSelectedStrategy] = useState('');
    const [initiativeName, setInitiativeName] = useState('');
    const [kpiTarget, setKpiTarget] = useState('');
    const [kpiUnit, setKpiUnit] = useState('');

    // --- State Tugasan (Assignee) Baharu ---
    const [assignmentType, setAssignmentType] = useState('Individual'); // Jenis tugasan
    const [selectedRole, setSelectedRole] = useState('');     // cth: 'PPD'
    const [selectedState, setSelectedState] = useState('');   // cth: 'Johor' (ID)
    const [selectedPPD, setSelectedPPD] = useState('');       // cth: 'PPD Batu Pahat' (ID)
    const [selectedAssignees, setSelectedAssignees] = useState([]); // Untuk individu
    // ------------------------------------

    const isEditMode = !!initiativeToEdit;

    // --- Muatkan SEMUA data lookup apabila modal dibuka ---
    useEffect(() => {
        if (isOpen) {
            const token = localStorage.getItem('authToken');
            const headers = { headers: { Authorization: `Bearer ${token}` } };

            // Panggil 'assignable' (yang kita buat sebelum ini) untuk senarai individu
            api.get('/users/assignable', headers).then(res => {
                // Ubah format data untuk Combobox
                const userOptions = res.data.map(u => ({ value: u._id, label: u.displayName }));
                setUsers(userOptions);
            });

            // Muatkan data Polisi, Negeri
            api.get('/policies', headers).then(res => setPolicies(res.data));
            api.get('/states', headers).then(res => setStates(res.data));

            // Jika Edit Mode
            if (initiativeToEdit) {
                setInitiativeName(initiativeToEdit.name);
                setKpiTarget(initiativeToEdit.kpi.target);
                setKpiUnit(initiativeToEdit.kpi.unit);

                // Pra-isi (pre-fill) jenis tugasan
                if (initiativeToEdit.assignedPPD) {
                    setAssignmentType('PPD');
                    // Perlu muatkan data PPD yang betul
                } else if (initiativeToEdit.assignedState) {
                    setAssignmentType('State');
                    setSelectedState(initiativeToEdit.assignedState);
                } else if (initiativeToEdit.assignedRole) {
                    setAssignmentType('Role');
                    setSelectedRole(initiativeToEdit.assignedRole);
                } else {
                    setAssignmentType('Individual');
                    setSelectedAssignees(initiativeToEdit.assignees.map(a => a._id || a));
                }
                // Nota: Memuatkan data edit untuk dropdown bertingkat (cascading) adalah rumit
                // Kita fokus pada 'Add Mode' dahulu.
            } else {
                // Reset borang untuk 'Add Mode'
                resetForm();
            }
        }
    }, [isOpen, initiativeToEdit]);

    // --- Logik Cascading Dropdown (Negeri -> PPD) ---
    useEffect(() => {
        if (selectedState && (assignmentType === 'PPD' || assignmentType === 'State')) {
            const fetchPPDs = async () => {
                try {
                    const token = localStorage.getItem('authToken');
                    const res = await api.get(`/ppds/by-state/${selectedState}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setPpds(res.data);
                } catch (error) {
                    console.error("Gagal mendapatkan senarai PPD:", error);
                }
            };
            fetchPPDs();
        } else {
            setPpds([]);
        }
    }, [selectedState, assignmentType]);

    // Fungsi reset
    const resetForm = () => {
        setInitiativeName(''); setKpiTarget(''); setKpiUnit('');
        setSelectedPolicy(''); setSelectedTeras(''); setSelectedStrategy('');
        setAssignmentType('Individual'); setSelectedRole(''); setSelectedState('');
        setSelectedPPD(''); setSelectedAssignees([]);
    };

    // Fungsi untuk Dropdown Polisi
    const handlePolicyChange = async (policyId) => {
        setSelectedPolicy(policyId);
        setSelectedTeras(''); setSelectedStrategy('');
        if (policyId) {
            const token = localStorage.getItem('authToken');
            const res = await api.get(`/teras?policyId=${policyId}`, { headers: { Authorization: `Bearer ${token}` } });
            setTerasItems(res.data);
        } else {
            setTerasItems([]);
        }
    };
    const handleTerasChange = async (terasId) => {
        setSelectedTeras(terasId);
        setSelectedStrategy('');
        if (terasId) {
            const token = localStorage.getItem('authToken');
            const res = await api.get(`/strategies?terasId=${terasId}`, { headers: { Authorization: `Bearer ${token}` } });
            setStrategies(res.data);
        } else {
            setStrategies([]);
        }
    };

    // Fungsi hantar (submit)
    const handleSubmit = async () => {
        const initiativeData = {
            name: initiativeName,
            kpi: { target: kpiTarget, unit: kpiUnit },
            strategy: selectedStrategy, // Wajib ada

            // Logik Tugasan Baharu
            assignees: assignmentType === 'Individual' ? selectedAssignees : [],
            assignedRole: assignmentType === 'Role' ? selectedRole : null,
            assignedState: (assignmentType === 'State' || assignmentType === 'PPD') ? selectedState : null,
            assignedPPD: assignmentType === 'PPD' ? selectedPPD : null,
        };

        try {
            const token = localStorage.getItem('authToken');
            if (isEditMode) {
                // Edit (anda perlu sempurnakan logik 'edit' berdasarkan data 'initiativeToEdit')
                await api.put(`/initiatives/${initiativeToEdit._id}`, initiativeData, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Berjaya!', 'Inisiatif telah dikemas kini.', 'success');
            } else {
                // Cipta
                await api.post('/initiatives', initiativeData, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Berjaya!', 'Inisiatif baharu telah dicipta.', 'success');
            }
            onInitiativeAdded();
            onClose();
        } catch (error) {
            Swal.fire('Ralat!', error.response?.data?.message || 'Permintaan gagal.', 'error');
        }
    };

    // Format data untuk Combobox (kekal sama)
    const policyOptions = policies.map(p => ({ value: p._id, label: p.name }));
    const terasOptions = terasItems.map(t => ({ value: t._id, label: t.name }));
    const strategyOptions = strategies.map(s => ({ value: s._id, label: s.name }));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>{isEditMode ? "Edit Inisiatif" : "Cipta Inisiatif Baharu"}</DialogTitle>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
                    {/* Bahagian 1: Hirarki Strategi (Hanya 'Add Mode') */}
                    {!isEditMode && (
                        <div className="space-y-4">
                            <div>
                                <Label>1. Dasar/Polisi</Label>
                                <Combobox options={policyOptions} value={selectedPolicy} onSelect={handlePolicyChange} placeholder="Pilih Dasar/Polisi..." searchPlaceholder="Cari Dasar/Polisi..." />
                            </div>
                            <div className={!selectedPolicy ? 'hidden' : ''}>
                                <Label>2. Teras</Label>
                                <Combobox options={terasOptions} value={selectedTeras} onSelect={handleTerasChange} placeholder="Pilih Teras..." searchPlaceholder="Cari teras..." />
                            </div>
                            <div className={!selectedTeras ? 'hidden' : ''}>
                                <Label>3. Strategi</Label>
                                <Combobox options={strategyOptions} value={selectedStrategy} onSelect={setSelectedStrategy} placeholder="Pilih Strategi..." searchPlaceholder="Cari strategi..." />
                            </div>
                        </div>
                    )}

                    {/* Bahagian 2: Maklumat Inisiatif (Tunjuk jika strategi dipilih atau dalam mode edit) */}
                    {(isEditMode || selectedStrategy) && (
                        <div className={isEditMode ? '' : 'pt-4 border-t'}>
                            <div className="space-y-4">
                                <div><Label htmlFor="initiativeName">Nama Inisiatif</Label><Input id="initiativeName" value={initiativeName} onChange={e => setInitiativeName(e.target.value)} required /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label htmlFor="kpiTarget">Sasaran KPI</Label><Input id="kpiTarget" type="number" value={kpiTarget} onChange={e => setKpiTarget(e.target.value)} placeholder="cth. 85" required /></div>
                                    <div><Label htmlFor="kpiUnit">KPI Unit</Label><Input id="kpiUnit" value={kpiUnit} onChange={e => setKpiUnit(e.target.value)} placeholder="cth. %, Projek, Program dll" required /></div>
                                </div>

                                {/* --- ✅ BLOK TUGASAN BAHARU --- */}
                                <div className="space-y-2 rounded-lg border p-4">
                                    <Label>4. Tugaskan Kepada (Assignment)</Label>
                                    <Select onValueChange={setAssignmentType} value={assignmentType}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Individual">Individu (User)</SelectItem>
                                            <SelectItem value="Role">Kumpulan Role (cth: Semua PPD)</SelectItem>
                                            <SelectItem value="State">Kumpulan Negeri (cth: Semua di Johor)</SelectItem>
                                            <SelectItem value="PPD">Kumpulan PPD (cth: PPD Batu Pahat)</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* --- Pilihan Tugasan Dinamik --- */}

                                    {/* 1. Tugasan Individu */}
                                    {assignmentType === 'Individual' && (
                                        <Combobox
                                            options={users} // Gunakan senarai 'users' yang diformat
                                            value={selectedAssignees[0] || ''} // (Ini masih single-select, perlu ditukar ke multi-select nanti)
                                            onSelect={(value) => setSelectedAssignees(value ? [value] : [])}
                                            placeholder="Pilih pengguna..."
                                            searchPlaceholder="Cari pengguna..."
                                        />
                                    )}

                                    {/* 2. Tugasan Kumpulan Role */}
                                    {assignmentType === 'Role' && (
                                        <Select onValueChange={setSelectedRole} value={selectedRole}>
                                            <SelectTrigger><SelectValue placeholder="Pilih Role..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PPD">Semua PPD</SelectItem>
                                                <SelectItem value="Negeri">Semua Negeri (JPN)</SelectItem>
                                                <SelectItem value="Bahagian">Semua Bahagian</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}

                                    {/* 3. Tugasan Kumpulan Negeri */}
                                    {assignmentType === 'State' && (
                                        <Select onValueChange={setSelectedState} value={selectedState}>
                                            <SelectTrigger><SelectValue placeholder="Pilih Negeri..." /></SelectTrigger>
                                            <SelectContent>
                                                {states.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}

                                    {/* 4. Tugasan Kumpulan PPD */}
                                    {assignmentType === 'PPD' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <Select onValueChange={setSelectedState} value={selectedState}>
                                                <SelectTrigger><SelectValue placeholder="Pilih Negeri Dahulu..." /></SelectTrigger>
                                                <SelectContent>
                                                    {states.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>

                                            <Select onValueChange={setSelectedPPD} value={selectedPPD} disabled={!selectedState || ppds.length === 0}>
                                                <SelectTrigger><SelectValue placeholder="Pilih PPD..." /></SelectTrigger>
                                                <SelectContent>
                                                    {ppds.length > 0 ? (
                                                        ppds.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)
                                                    ) : (
                                                        <div className="p-2 text-sm text-muted-foreground">Pilih Negeri...</div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    {/* --- Tamat Pilihan Tugasan --- */}
                                </div>
                                {/* --- TAMAT BLOK TUGASAN BAHARU --- */}

                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                    <Button type="button" onClick={handleSubmit} disabled={!isEditMode && !selectedStrategy}>
                        {isEditMode ? "Simpan Perubahan" : "Cipta Inisiatif"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default AddInitiativeModal;