import { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../api';

function AddUserModal({ isOpen, onClose, onUserAdded }) {
    // State for each form field
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('owner');
    const [department, setDepartment] = useState(''); // --- ADD THIS ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userData = { firstName, lastName, email, password, role, department };
        try {
            await api.post('/users/register', userData);

            await Swal.fire('Success!', 'User created successfully.', 'success');

            // --- THIS IS THE FIX ---
            // This line tells the parent page to re-fetch the user list.
            onUserAdded();

            onClose(); // This should be the last step.
        } catch (error) {
            Swal.fire('Error!', error.response?.data?.message || 'Failed to create user.', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Add New User</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full border p-2 rounded-lg" />
                        <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full border p-2 rounded-lg" />
                    </div>
                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border p-2 rounded-lg" />
                    <input type="password" placeholder="Temporary Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border p-2 rounded-lg" />
                    <div className="grid grid-cols-2 gap-6">
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border p-2 rounded-lg">
                            <option value="owner">Initiative Owner</option>
                            <option value="admin">Administrator</option>
                            <option value="viewer">Viewer</option>
                        </select>
                        {/* --- ADD THIS DROPDOWN --- */}
                        <select value={department} onChange={(e) => setDepartment(e.target.value)} required className="w-full border p-2 rounded-lg">
                            <option value="">Select department...</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Physics">Physics</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 border rounded-lg">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg">Create User</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddUserModal;