import api from '@/api';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from 'react';
import Swal from "sweetalert2";

// props 'open' ditukar kepada 'isOpen' untuk sepadan dengan kod anda
function AddUserModal({ isOpen, onClose, onUserAdded, userToEdit }) {
    // State sedia ada
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('User'); // Default role baharu
    const [department, setDepartment] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);

    // State sedia ada untuk Department (jika anda masih gunakannya)
    const [departmentsList, setDepartmentsList] = useState([]);
    const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);

    // --- State Baharu untuk Hierarki ---
    const [states, setStates] = useState([]); // Senarai semua negeri
    const [ppds, setPpds] = useState([]);     // Senarai PPD yang ditapis
    const [selectedState, setSelectedState] = useState('');
    const [selectedPPD, setSelectedPPD] = useState('');
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingPPDs, setIsLoadingPPDs] = useState(false);
    // -------------------------------------

    // useEffect untuk mengambil data department (sedia ada)
    useEffect(() => {
        if (isOpen) {
            const fetchDepartments = async () => {
                setIsLoadingDepartments(true);
                try {
                    // Anda perlu pastikan route ini wujud di backend/server.js
                    const response = await api.get('/departments');
                    setDepartmentsList(response.data);
                } catch (error) {
                    console.error("Gagal memuatkan department:", error);
                } finally {
                    setIsLoadingDepartments(false);
                }
            };
            fetchDepartments();
        }
    }, [isOpen]);

    // ✅ TAMBAHAN: useEffect untuk mengambil data NEGERI
    useEffect(() => {
        if (isOpen) {
            const fetchStates = async () => {
                setIsLoadingStates(true);
                try {
                    const token = localStorage.getItem('authToken');
                    const res = await api.get('/states', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setStates(res.data);
                } catch (error) {
                    console.error("Gagal mendapatkan senarai negeri:", error);
                } finally {
                    setIsLoadingStates(false);
                }
            };
            fetchStates();
        }
    }, [isOpen]);

    // ✅ TAMBAHAN: useEffect untuk mengambil PPD berdasarkan NEGERI
    useEffect(() => {
        // Hanya fetch PPD jika role ialah PPD dan satu negeri telah dipilih
        // atau jika role 'Negeri' dalam edit mode (untuk tunjukkan PPD sedia ada)
        if (selectedState && (role === 'PPD' || (role === 'Negeri' && isEditMode))) {
            const fetchPPDs = async () => {
                setIsLoadingPPDs(true);
                setPpds([]); // Kosongkan senarai lama dahulu
                try {
                    const token = localStorage.getItem('authToken');
                    const res = await api.get(`/ppds/by-state/${selectedState}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setPpds(res.data);

                    // Logik untuk 'Edit Mode': tetapkan PPD jika ia wujud
                    if (isEditMode) {
                        const ppdId = userToEdit?.ppd?._id || userToEdit?.ppd;
                        if (ppdId && res.data.some(p => p._id === ppdId)) {
                            setSelectedPPD(ppdId);
                        }
                    } else {
                        setSelectedPPD(''); // Reset jika 'Add Mode'
                    }

                } catch (error) {
                    console.error("Gagal mendapatkan senarai PPD:", error);
                    setPpds([]);
                } finally {
                    setIsLoadingPPDs(false);
                }
            };
            fetchPPDs();
        } else {
            setPpds([]); // Kosongkan PPD jika tiada negeri dipilih
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedState, role, isEditMode, isOpen]);


    // ✅ DIKEMASKINI: useEffect untuk 'userToEdit'
    useEffect(() => {
        if (userToEdit && isOpen) {
            setIsEditMode(true);
            setFirstName(userToEdit.firstName);
            setLastName(userToEdit.lastName);
            setEmail(userToEdit.email);
            setDepartment(userToEdit.department || '');

            // --- ✅ PEMBETULAN NORMALISASI ROLE ---
            const userRole = userToEdit.role;
            if (userRole === 'admin') {
                setRole('Admin');
            } else if (userRole === 'owner' || userRole === 'viewer') {
                setRole('User');
            } else {
                setRole(userRole || 'User');
            }
            // --- TAMAT PEMBETULAN ---

            const stateId = userToEdit.state?._id || userToEdit.state || '';
            setSelectedState(stateId);

            const ppdId = userToEdit.ppd?._id || userToEdit.ppd || '';
            setSelectedPPD(ppdId);

            setPassword('');
        } else {
            setIsEditMode(false);
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword('');
            setRole('User'); // Default role baharu
            setDepartment('');
            setSelectedState('');
            setSelectedPPD('');
            setPpds([]);
        }
    }, [userToEdit, isOpen]);

    // ✅ DIKEMASKINI: handleSubmit
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validasi Baharu
        if (role === 'Bahagian' && !department) {
            Swal.fire('Ralat!', 'Sila pilih Bahagian.', 'error');
            return;
        }
        if ((role === 'Negeri' || role === 'PPD') && !selectedState) {
            Swal.fire('Ralat!', 'Sila pilih Negeri.', 'error');
            return;
        }
        if (role === 'PPD' && !selectedPPD) {
            Swal.fire('Ralat!', 'Sila pilih PPD.', 'error');
            return;
        }

        const userData = {
            firstName,
            lastName,
            email,
            role,
        };

        // ✅ 1. TETAPKAN DEFAULT PASSWORD
        const DEFAULT_PASSWORD = "STEM@Password1";

        if (password) {
            // Jika admin taip sendiri password, guna yang itu
            userData.password = password;
        } else if (!isEditMode) {
            // ✅ Jika admin tak isi (kosong), guna default
            userData.password = DEFAULT_PASSWORD;
            userData.mustChangePassword = true; // (Optional: Pastikan backend sokong ini)
        }

        // ✅ PEMBETULAN: Hantar 'null' untuk $unset data lama
        if (role === 'Bahagian') {
            userData.department = department;
            userData.state = null;
            userData.ppd = null;
        } else if (role === 'Negeri') {
            userData.department = null;
            userData.state = selectedState;
            userData.ppd = null;
        } else if (role === 'PPD') {
            userData.department = null;
            userData.state = selectedState;
            userData.ppd = selectedPPD;
        } else { // Admin or User
            userData.department = null;
            userData.state = null;
            userData.ppd = null;
        }

        try {
            const token = localStorage.getItem('authToken');
            let responseMessage = '';

            if (isEditMode) {
                await api.put(`/users/${userToEdit._id}`, userData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                responseMessage = 'Pengguna berjaya dikemas kini.';
            } else {
                await api.post('/users/register', userData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                responseMessage = 'Pengguna baharu berjaya dicipta.';
            }

            onClose(); // Tutup modal

            Swal.fire({
                title: 'Berjaya!',
                text: responseMessage,
                icon: 'success',
            }).then(() => {
                onUserAdded(); // Panggil fungsi refresh
            });

        } catch (error) {
            Swal.fire({
                title: 'Ralat!',
                text: error.response?.data?.message || 'Permintaan gagal.',
                icon: 'error'
            });
        }
    };

    // Apabila Role ditukar, reset pilihan bawahan
    const handleRoleChange = (newRole) => {
        setRole(newRole);
        setSelectedState('');
        setSelectedPPD('');
        setDepartment('');
        setPpds([]);
    };

    // Apabila Negeri ditukar, reset PPD
    const handleStateChange = (newStateId) => {
        setSelectedState(newStateId);
        setSelectedPPD('');
        setPpds([]);
    };


    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Kemas kini Pengguna' : 'Tambah Pengguna Baharu'}</DialogTitle>
                    <DialogDescription>
                        Isi maklumat di bawah untuk {isEditMode ? 'mengemas kini' : 'mendaftar'} pengguna.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label htmlFor="firstName">Nama Pertama *</Label><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                        <div><Label htmlFor="lastName">Nama Akhir *</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
                    </div>
                    <div><Label htmlFor="email">Alamat E-mel *</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                    <div><Label htmlFor="password">Kata Laluan</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            // ✅ Ubah placeholder supaya admin tahu
                            placeholder={isEditMode
                                ? "Biar kosong untuk kekal"
                                : "Biarkan kosong untuk default (STEM@Password1)"}
                            // ✅ Buang 'required' supaya boleh submit kosong
                            autoComplete="new-password"
                        /></div>

                    {/* --- KEMAS KINI BAHAGIAN HIERARKI --- */}
                    <div>
                        <Label>Peranan (Role) *</Label>
                        <Select onValueChange={handleRoleChange} value={role}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Admin">Admin (Super Admin)</SelectItem>
                                <SelectItem value="Bahagian">Bahagian</SelectItem>
                                <SelectItem value="Negeri">Negeri (JPN)</SelectItem>
                                <SelectItem value="PPD">PPD</SelectItem>
                                <SelectItem value="User">User (Pengguna Biasa)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tunjuk medan ini jika Role = Bahagian */}
                    {role === 'Bahagian' && (
                        <div>
                            <Label>Bahagian (Jabatan) *</Label>
                            <Select onValueChange={setDepartment} value={department} required>
                                <SelectTrigger><SelectValue placeholder="Pilih bahagian..." /></SelectTrigger>
                                <SelectContent>
                                    {isLoadingDepartments ? (
                                        <SelectItem value="loading" disabled>Memuatkan...</SelectItem>
                                    ) : (
                                        departmentsList.map((dept) => (
                                            <SelectItem key={dept._id} value={dept.name}>
                                                {dept.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Tunjuk medan ini jika Role = Negeri atau PPD */}
                    {(role === 'Negeri' || role === 'PPD') && (
                        <div>
                            <Label htmlFor="state">Negeri *</Label>
                            <Select onValueChange={handleStateChange} value={selectedState} required>
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoadingStates ? "Memuatkan..." : "Pilih negeri"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {states.map(s => (
                                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Tunjuk medan ini jika Role = PPD dan Negeri telah dipilih */}
                    {role === 'PPD' && selectedState && (
                        <div>
                            <Label htmlFor="ppd">PPD *</Label>
                            <Select onValueChange={setSelectedPPD} value={selectedPPD} required>
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoadingPPDs ? "Memuatkan..." : "Pilih PPD"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* ✅ PEMBETULAN BUG (Ralat value="") */}
                                    {isLoadingPPDs ? (
                                        <div className="p-2 text-sm text-muted-foreground">Memuatkan PPD...</div>
                                    ) : ppds.length > 0 ? (
                                        ppds.map(p => (
                                            <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-2 text-sm text-muted-foreground">
                                            Tiada PPD ditemui untuk negeri ini.
                                        </div>
                                    )}
                                    {/* --- TAMAT PEMBETULAN BUG --- */}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {/* --- TAMAT BAHAGIAN HIERARKI --- */}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                        <Button type="submit">{isEditMode ? 'Kemas kini' : 'Cipta Pengguna'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default AddUserModal;