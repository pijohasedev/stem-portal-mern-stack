import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import AddUserModal from './AddUserModal';
import Badge from './Badge';

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await api.get('/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    if (loading) {
        return <p className="text-center text-gray-500">Loading users...</p>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold">User Management</h1>
                <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">
                    <i className="fas fa-plus mr-2"></i>Add User
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left py-3 px-6 font-medium text-gray-900">User</th>
                            <th className="text-left py-3 px-6 font-medium text-gray-900">Role</th>
                            <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                            <th className="text-left py-3 px-6 font-medium text-gray-900">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {/* --- THIS IS THE CORRECTED LOGIC --- */}
                        {users.length > 0 ? (
                            users.map(user => {
                                let roleColor = 'gray';
                                if (user.role === 'admin') roleColor = 'red';
                                if (user.role === 'owner') roleColor = 'blue';
                                if (user.role === 'viewer') roleColor = 'green';

                                const statusColor = user.status === 'Active' ? 'green' : 'gray';

                                return (
                                    <tr key={user._id} className="hover:bg-gray-50">
                                        <td className="py-4 px-6">
                                            <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                                            <div className="text-sm text-gray-600">{user.email}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <Badge text={user.role} color={roleColor} />
                                        </td>
                                        <td className="py-4 px-6">
                                            <Badge text={user.status} color={statusColor} />
                                        </td>
                                        <td className="py-4 px-6">
                                            <button className="text-blue-600 text-sm font-medium">Edit</button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center py-8 text-gray-500">No users found.</td>
                            </tr>
                        )}
                        {/* ------------------------------------ */}
                    </tbody>
                </table>
            </div>

            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUserAdded={fetchUsers}
            />
        </div>
    );
}

export default UserManagement;