import api from '@/api';
import AddUserModal from '@/components/pages/AddUserModal';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, EllipsisVertical, Pencil, Plus, RefreshCcw, Search, Trash2, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
// ✅ Import Komponen Tab & Audit
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuditLogTab from './AuditLogTab';

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
    const [statesList, setStatesList] = useState([]);

    // ✅ STATE BARU UNTUK SORTING & ADMIN CHECK
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [isAdmin, setIsAdmin] = useState(false);

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

    // Check Admin Role semasa load
    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (user.role === 'Admin') {
                    setIsAdmin(true);
                }
            }
        } catch (e) { console.error(e); }

        fetchData();
    }, []);

    // 2. Logik Penapisan (Filtering Logic) + SORTING
    useEffect(() => {
        let result = [...users];

        // a. Filter Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(user =>
                user.firstName.toLowerCase().includes(lowerTerm) ||
                user.lastName.toLowerCase().includes(lowerTerm) ||
                user.email.toLowerCase().includes(lowerTerm)
            );
        }

        // b. Filter Role
        if (roleFilter !== 'all') {
            result = result.filter(user => user.role === roleFilter);
        }

        // c. Filter State
        if (stateFilter !== 'all') {
            result = result.filter(user => {
                const userStateId = user.state?._id || user.state;
                return userStateId === stateFilter;
            });
        }

        // d. Sorting
        if (sortConfig.key) {
            result.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'name') {
                    aValue = (a.firstName + a.lastName).toLowerCase();
                    bValue = (b.firstName + b.lastName).toLowerCase();
                } else if (sortConfig.key === 'lastLogin') {
                    aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
                    bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
                } else if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        setFilteredUsers(result);
    }, [users, searchTerm, roleFilter, stateFilter, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- Handlers ---
    const handleAddUser = () => { setUserToEdit(null); setIsModalOpen(true); };
    const handleEditUser = (user) => { setUserToEdit(user); setIsModalOpen(true); };
    const handleUserAddedOrUpdated = () => { fetchData(); };

    const handleToggleStatus = async (user) => {
        const action = user.status === 'Suspended' ? 'activate' : 'suspend';
        try {
            const token = localStorage.getItem('authToken');
            await api.patch(`/users/${user._id}/${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire('Berjaya!', `Status dikemaskini.`, 'success');
            fetchData();
        } catch (e) { Swal.fire('Ralat', 'Gagal.', 'error'); }
    };

    const handleResetPassword = async (userId, userName) => {
        try {
            const token = localStorage.getItem('authToken');
            await api.post(`/users/${userId}/reset-password`, {}, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire('Selesai!', 'Password reset.', 'success');
        } catch (e) { Swal.fire('Ralat', 'Gagal reset.', 'error'); }
    };

    const getLocationDisplay = (user) => {
        const textStyle = "text-sm font-medium text-slate-900 dark:text-slate-100";
        if (user.role === 'Bahagian') return <span className={textStyle}>{user.department || '-'}</span>;
        const stateName = user.state?.name || '';
        const ppdName = user.ppd?.name || '';
        if (user.role === 'Negeri') return <span className={textStyle}>{stateName ? `JPN ${stateName}` : '-'}</span>;
        if (user.role === 'PPD') return <span className={textStyle}>{ppdName || '-'}</span>;
        return <span className="text-muted-foreground">-</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pengurusan Pengguna</h1>
                    <p className="text-muted-foreground">Urus akaun kakitangan, peranan, dan akses sistem.</p>
                </div>
                {/* Butang dipindahkan ke dalam TabsContent 'users' supaya UI lebih kemas */}
            </div>

            {/* ✅ SISTEM TAB */}
            <Tabs defaultValue="users" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="users">Senarai Pengguna</TabsTrigger>
                    {isAdmin && <TabsTrigger value="audit">Jejak Audit</TabsTrigger>}
                </TabsList>

                {/* --- TAB 1: SENARAI PENGGUNA (User Table) --- */}
                <TabsContent value="users">
                    <div className="flex justify-end mb-4">
                        <Button onClick={handleAddUser}><Plus className="mr-2 h-4 w-4" /> Tambah Pengguna</Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Senarai Pengguna</CardTitle>
                            <div className="flex flex-col md:flex-row gap-4 mt-4">
                                <div className="relative w-full md:w-1/3">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Cari nama..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Peranan" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Peranan</SelectItem>
                                        <SelectItem value="Admin">Admin</SelectItem>
                                        <SelectItem value="Bahagian">Bahagian</SelectItem>
                                        <SelectItem value="Negeri">Negeri</SelectItem>
                                        <SelectItem value="PPD">PPD</SelectItem>
                                        <SelectItem value="User">User</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={stateFilter} onValueChange={setStateFilter}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Negeri" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Negeri</SelectItem>
                                        {statesList.map(state => (<SelectItem key={state._id} value={state._id}>{state.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                {(searchTerm || roleFilter !== 'all' || stateFilter !== 'all') && (
                                    <Button variant="ghost" onClick={() => { setSearchTerm(''); setRoleFilter('all'); setStateFilter('all'); }}>Reset</Button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent>
                            {loading ? <div className="text-center py-10">Memuatkan data...</div> : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => requestSort('name')}>
                                                    <div className="flex items-center gap-1">Nama <ArrowUpDown className="h-3 w-3" /></div>
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => requestSort('role')}>
                                                    <div className="flex items-center gap-1">Peranan <ArrowUpDown className="h-3 w-3" /></div>
                                                </TableHead>
                                                <TableHead>Lokasi / Unit</TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => requestSort('lastLogin')}>
                                                    <div className="flex items-center gap-1">Aktif Terakhir <ArrowUpDown className="h-3 w-3" /></div>
                                                </TableHead>
                                                <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => requestSort('status')}>
                                                    <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></div>
                                                </TableHead>
                                                <TableHead className="text-right">Tindakan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredUsers.length > 0 ? (
                                                filteredUsers.map((user) => (
                                                    <TableRow key={user._id}>
                                                        <TableCell>
                                                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                                        </TableCell>
                                                        <TableCell><Badge variant="outline" className="capitalize">{user.role}</Badge></TableCell>
                                                        <TableCell>{getLocationDisplay(user)}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">
                                                                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Belum'}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {user.lastLogin ? new Date(user.lastLogin).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} variant="secondary">
                                                                {user.status || 'Active'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0"><EllipsisVertical className="h-4 w-4" /></Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Tindakan</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => handleEditUser(user)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleResetPassword(user._id, user.firstName)} className="text-orange-600"><RefreshCcw className="mr-2 h-4 w-4" /> Reset Password</DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem className={user.status === 'Suspended' ? "text-green-600" : "text-red-600"} onClick={() => handleToggleStatus(user)}>
                                                                        {user.status === 'Suspended' ? <><Trash2 className="mr-2 h-4 w-4" /> Aktifkan</> : <><UserX className="mr-2 h-4 w-4" /> Gantung</>}
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow><TableCell colSpan={6} className="h-24 text-center">Tiada pengguna ditemui.</TableCell></TableRow>
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
                </TabsContent>

                {/* --- TAB 2: JEJAK AUDIT (Admin Only) --- */}
                {isAdmin && (
                    <TabsContent value="audit">
                        <AuditLogTab />
                    </TabsContent>
                )}
            </Tabs>

            <AddUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onUserAdded={handleUserAddedOrUpdated} userToEdit={userToEdit} />
        </div>
    );
}

export default UserManagement;