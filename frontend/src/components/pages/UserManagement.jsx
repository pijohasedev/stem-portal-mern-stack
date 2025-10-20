import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowPathIcon, CheckCircleIcon, EllipsisHorizontalIcon, PlusIcon, TrashIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import AddUserModal from './AddUserModal';

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [rowSelection, setRowSelection] = useState({});

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await api.get('/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUsers(response.data);
            setRowSelection({}); // Clear selection on refresh
        } catch (error) {
            console.error("Failed to fetch users:", error);
            Swal.fire('Error!', 'Failed to fetch user data.', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenAddModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleSuspend = (user) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to suspend ${user.firstName} ${user.lastName}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, suspend them!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('authToken');
                    await api.patch(`/users/${user._id}/suspend`, {}, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    Swal.fire('Suspended!', 'The user has been suspended.', 'success');
                    fetchUsers();
                } catch (error) {
                    Swal.fire('Error!', error.response?.data?.message || 'Failed to suspend user.', 'error');
                }
            }
        });
    };

    const handleActivate = async (user) => {
        try {
            const token = localStorage.getItem('authToken');
            await api.patch(`/users/${user._id}/activate`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            Swal.fire('Activated!', `${user.firstName} ${user.lastName} has been reactivated.`, 'success');
            fetchUsers();
        } catch (error) {
            Swal.fire('Error!', error.response?.data?.message || 'Failed to activate user.', 'error');
        }
    };

    const handleBulkSuspend = () => {
        const selectedIndexes = Object.keys(rowSelection).map(Number);
        const userIds = selectedIndexes.map(index => users[index]._id);

        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to suspend ${userIds.length} user(s).`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, suspend them!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('authToken');
                    await api.post('/users/bulk-suspend', { userIds }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    Swal.fire('Suspended!', `${userIds.length} users have been suspended.`, 'success');
                    fetchUsers();
                } catch (error) {
                    Swal.fire('Error!', error.response?.data?.message || 'Failed to suspend users.', 'error');
                }
            }
        });
    };

    const handleBulkActivate = () => {
        const selectedIndexes = Object.keys(rowSelection).map(Number);
        const userIds = selectedIndexes.map(index => users[index]._id);

        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to activate ${userIds.length} user(s).`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Yes, activate them!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('authToken');
                    await api.post('/users/bulk-activate', { userIds }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    Swal.fire('Activated!', `${userIds.length} users have been activated.`, 'success');
                    fetchUsers();
                } catch (error) {
                    Swal.fire('Error!', error.response?.data?.message || 'Failed to activate users.', 'error');
                }
            }
        });
    };

    if (loading) {
        return <p className="text-center text-muted-foreground">Loading users...</p>;
    }

    const getRoleVariant = (role) => {
        switch (role) {
            case 'admin': return 'destructive';
            case 'owner': return 'default';
            case 'viewer': return 'outline';
            default: return 'secondary';
        }
    };

    const selectedRowCount = Object.keys(rowSelection).length;
    const selectedUsers = selectedRowCount > 0 ? Object.keys(rowSelection).map(index => users[index]) : [];
    const canSuspend = selectedRowCount > 0 && selectedUsers.every(user => user.status === 'Active');
    const canActivate = selectedRowCount > 0 && selectedUsers.every(user => user.status === 'Suspended');

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold">User Management</h1>
                <div className="flex items-center gap-2">
                    {canSuspend && (
                        <Button variant="destructive" onClick={handleBulkSuspend}>
                            <TrashIcon className="h-5 w-5 mr-2" />
                            Suspend Selected ({selectedRowCount})
                        </Button>
                    )}
                    {canActivate && (
                        <Button variant="outline" onClick={handleBulkActivate}>
                            <ArrowPathIcon className="h-5 w-5 mr-2" />
                            Activate Selected ({selectedRowCount})
                        </Button>
                    )}
                    <Button onClick={handleOpenAddModal}>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add User
                    </Button>
                </div>
            </div>

            <div className="bg-card rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">
                                <Checkbox
                                    checked={selectedRowCount > 0 && selectedRowCount === users.length}
                                    onCheckedChange={(value) => {
                                        const newSelection = {};
                                        if (value) {
                                            users.forEach((_, index) => newSelection[index] = true);
                                        }
                                        setRowSelection(newSelection);
                                    }}
                                    aria-label="Select all rows"
                                />
                            </TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length > 0 ? (
                            users.map((user, index) => (
                                <TableRow key={user._id} data-state={rowSelection[index] && "selected"}>
                                    <TableCell>
                                        <Checkbox
                                            checked={rowSelection[index] || false}
                                            onCheckedChange={(value) => {
                                                const newSelection = { ...rowSelection };
                                                if (value) {
                                                    newSelection[index] = true;
                                                } else {
                                                    delete newSelection[index];
                                                }
                                                setRowSelection(newSelection);
                                            }}
                                            aria-label="Select row"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                                        <div className="text-sm text-muted-foreground">{user.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getRoleVariant(user.role)}>{user.role}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.department || 'N/A'} {/* Papar department, atau 'N/A' jika tiada */}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="flex items-center gap-1.5 w-fit">
                                            {user.status === 'Active' ? (
                                                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircleIcon className="h-4 w-4 text-red-500" />
                                            )}
                                            <span>{user.status}</span>
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <EllipsisHorizontalIcon className="h-5 w-5" />
                                                    <span className="sr-only">Open actions</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenEditModal(user)}>
                                                    Edit
                                                </DropdownMenuItem>
                                                {user.status === 'Active' ? (
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleSuspend(user)}>
                                                        Suspend
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => handleActivate(user)}>
                                                        Activate
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-sm text-muted-foreground mt-2">
                {selectedRowCount} of {users.length} row(s) selected.
            </div>

            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUserAdded={fetchUsers}
                userToEdit={editingUser}
            />
        </div>
    );
}

export default UserManagement;