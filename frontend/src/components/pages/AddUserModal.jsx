import api from '@/api';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

function AddUserModal({ isOpen, onClose, onUserAdded, userToEdit }) {
    // State for each form field
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('owner');
    const [department, setDepartment] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [departmentsList, setDepartmentsList] = useState([]);
    const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);


    // useEffect untuk mengambil data department
    useEffect(() => {
        if (isOpen) { // Hanya fetch jika modal dibuka
            const fetchDepartments = async () => {
                setIsLoadingDepartments(true);
                try {
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
    }, [isOpen]); // Dijalankan setiap kali 'isOpen' berubah


    // This effect runs whenever the 'userToEdit' prop changes
    useEffect(() => {
        if (userToEdit) {
            setIsEditMode(true);
            setFirstName(userToEdit.firstName);
            setLastName(userToEdit.lastName);
            setEmail(userToEdit.email);
            setRole(userToEdit.role);
            setDepartment(userToEdit.department);
            setPassword(''); // Clear password for security
        } else {
            setIsEditMode(false);
            // Reset all fields for "Add" mode
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword('');
            setRole('owner');
            setDepartment('');
        }
    }, [userToEdit]);

    // "Smart" submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!department) {
            Swal.fire('Error!', 'Please select a department.', 'error');
            return;
        }

        const userData = { firstName, lastName, email, role, department };
        if (password) {
            userData.password = password;
        }

        try {
            const token = localStorage.getItem('authToken');
            let responseMessage = '';

            if (isEditMode) {
                // --- UPDATE LOGIC ---
                await api.put(`/users/${userToEdit._id}`, userData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                responseMessage = 'User updated successfully.';
            } else {
                // --- CREATE LOGIC ---
                await api.post('/users/register', userData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                responseMessage = 'User created successfully.';
            }

            // --- PERUBAHAN UTAMA DI SINI ---

            // 1. TUTUP MODAL FORM DAHULU untuk melepaskan 'focus trap'
            onClose();

            // 2. KEMUDIAN, paparkan mesej kejayaan.
            //    Gunakan .then() untuk refresh senarai selepas pengguna klik OK.
            Swal.fire({
                title: 'Success!',
                text: responseMessage,
                icon: 'success',
            }).then(() => {
                // 3. Refresh senarai pengguna selepas alert ditutup.
                onUserAdded();
            });

        } catch (error) {
            // Paparkan ralat terus dalam SweetAlert juga
            Swal.fire({
                title: 'Error!',
                text: error.response?.data?.message || 'Request failed.',
                icon: 'error'
            });
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit User' : 'Add New User'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label htmlFor="firstName">Nama Pertama</Label><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                        <div><Label htmlFor="lastName">Nama Akhir</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
                    </div>
                    <div><Label htmlFor="email">Alamat E-mel</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                    <div><Label htmlFor="password">Kata Laluan</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEditMode ? "Leave blank to keep current" : "Temporary Password"} required={!isEditMode} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Peranan</Label>
                            <Select onValueChange={setRole} value={role}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="owner">Pemilik Inisiatif</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="viewer">Pemerhati</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Bahagian</Label>
                            <Select onValueChange={setDepartment} value={department} required>
                                <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                                <SelectContent>
                                    {/* --- BAHAGIAN YANG DIUBAH --- */}
                                    {isLoadingDepartments ? (
                                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                                    ) : (
                                        departmentsList.map((dept) => (
                                            <SelectItem key={dept._id} value={dept.name}>
                                                {dept.name}
                                            </SelectItem>
                                        ))
                                    )}
                                    {/* --- TAMAT BAHAGIAN DIUBAH --- */}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">{isEditMode ? 'Save Changes' : 'Create User'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default AddUserModal;