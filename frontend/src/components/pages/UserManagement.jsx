import api from '@/api';
import AddUserModal from '@/components/pages/AddUserModal';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EllipsisVertical, Pencil, Plus, Search, Trash2, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);

    // --- STATE UNTUK FILTER & SEARCH ---
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [stateFilter, setStateFilter] = useState('all');

    // Data Lookup (untuk dropdown filter)
    const [statesList, setStatesList] = useState([]);

    // 1. Fetch Users & States
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const headers = { headers: { Authorization: `Bearer ${token}` } };

            const [usersRes, statesRes] = await Promise.all([
                api.get('/users', headers),
                api.get('/states', headers)
            ]);

            setUsers(usersRes.data);
            setFilteredUsers(usersRes.data);
            setStatesList(statesRes.data);

        } catch (error) {
            console.error('Gagal memuatkan data:', error);
            Swal.fire('Ralat', 'Gagal memuatkan senarai pengguna.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. Logik Penapisan (Filtering Logic)
    useEffect(() => {
        let result = users;

        // a. Filter mengikut Carian (Nama/Email)
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(user =>
                user.firstName.toLowerCase().includes(lowerTerm) ||
                user.lastName.toLowerCase().includes(lowerTerm) ||
                user.email.toLowerCase().includes(lowerTerm)
            );
        }

        // b. Filter mengikut Role
        if (roleFilter !== 'all') {
            result = result.filter(user => user.role === roleFilter);
        }

        // c. Filter mengikut Negeri (State)
        if (stateFilter !== 'all') {
            result = result.filter(user => {
                const userStateId = user.state?._id || user.state; // Handle populated object or ID string
                return userStateId === stateFilter;
            });
        }

        setFilteredUsers(result);
    }, [users, searchTerm, roleFilter, stateFilter]);


    // --- Handlers ---

    const handleAddUser = () => {
        setUserToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setUserToEdit(user);
        setIsModalOpen(true);
    };

    const handleUserAddedOrUpdated = () => {
        fetchData();
    };

    const handleToggleStatus = async (user) => {
        const action = user.status === 'Suspended' ? 'activate' : 'suspend';
        const confirmText = action === 'suspend'
            ? "Pengguna ini tidak akan dapat log masuk."
            : "Pengguna ini akan dibenarkan log masuk semula.";

        const result = await Swal.fire({
            title: `Pasti untuk ${action}?`,
            text: confirmText,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: action === 'suspend' ? '#d33' : '#3085d6',
            confirmButtonText: `Ya, ${action}!`
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('authToken');
                await api.patch(`/users/${user._id}/${action}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Berjaya!', `Pengguna telah di-${action}.`, 'success');
                fetchData();
            } catch (error) {
                Swal.fire('Ralat', `Gagal melakukan aksi ${action}.`, 'error');
            }
        }
    };

    // Helper untuk paparan lokasi (Versi Teks Hitam & Ringkas)
    const getLocationDisplay = (user) => {
        // Kelas untuk font hitam biasa
        const textStyle = "text-sm font-medium text-slate-900 dark:text-slate-100";

        // 1. Paparan untuk BAHAGIAN
        if (user.role === 'Bahagian') {
            return <span className={textStyle}>{user.department || '-'}</span>;
        }

        // Ambil nama
        const stateName = user.state?.name || '';
        const ppdName = user.ppd?.name || '';

        // 2. Paparan untuk NEGERI (Tambah 'JPN ' di depan)
        if (user.role === 'Negeri') {
            return (
                <span className={textStyle}>
                    {stateName ? `JPN ${stateName}` : '-'}
                </span>
            );
        }

        // 3. Paparan untuk PPD (Hanya nama PPD, tiada negeri)
        if (user.role === 'PPD') {
            return (
                <span className={textStyle}>
                    {ppdName || '-'}
                </span>
            );
        }

        return <span className="text-muted-foreground">-</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pengurusan Pengguna</h1>
                    <p className="text-muted-foreground">Urus akaun kakitangan, peranan, dan akses sistem.</p>
                </div>
                <Button onClick={handleAddUser}>
                    <Plus className="mr-2 h-4 w-4" /> Tambah Pengguna
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Senarai Pengguna</CardTitle>

                    {/* --- TOOLBAR PENAPISAN --- */}
                    <div className="flex flex-col md:flex-row gap-4 mt-4">
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama atau email..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Semua Peranan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Peranan</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Bahagian">Bahagian</SelectItem>
                                <SelectItem value="Negeri">Negeri (JPN)</SelectItem>
                                <SelectItem value="PPD">PPD</SelectItem>
                                <SelectItem value="User">User</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={stateFilter} onValueChange={setStateFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Semua Negeri" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Negeri</SelectItem>
                                {statesList.map(state => (
                                    <SelectItem key={state._id} value={state._id}>
                                        {state.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {(searchTerm || roleFilter !== 'all' || stateFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setSearchTerm('');
                                    setRoleFilter('all');
                                    setStateFilter('all');
                                }}
                            >
                                Reset
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="text-center py-10">Memuatkan data...</div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Peranan</TableHead>
                                        <TableHead>Lokasi / Unit</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Tindakan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map((user) => (
                                            <TableRow key={user._id}>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {user.firstName} {user.lastName}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {user.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {getLocationDisplay(user)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                                                        variant="secondary"
                                                    >
                                                        {user.status || 'Active'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Buka menu</span>
                                                                <EllipsisVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Tindakan</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className={user.status === 'Suspended' ? "text-green-600" : "text-red-600"}
                                                                onClick={() => handleToggleStatus(user)}
                                                            >
                                                                {user.status === 'Suspended' ? (
                                                                    <><Trash2 className="mr-2 h-4 w-4" /> Aktifkan Semula</>
                                                                ) : (
                                                                    <><UserX className="mr-2 h-4 w-4" /> Gantung Akaun</>
                                                                )}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                Tiada pengguna ditemui.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    <div className="mt-4 text-sm text-muted-foreground">
                        Menunjukkan {filteredUsers.length} daripada {users.length} pengguna.
                    </div>
                </CardContent>
            </Card>

            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUserAdded={handleUserAddedOrUpdated}
                userToEdit={userToEdit}
            />
        </div>
    );
}

export default UserManagement;