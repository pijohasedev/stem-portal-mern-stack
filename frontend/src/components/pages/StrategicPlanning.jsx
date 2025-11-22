import api from '@/api';
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowDownTrayIcon, ChevronDownIcon, ChevronRightIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import EditItemModal from './EditItemModal';

function StrategicPlanning() {
    // State for data lists
    const [policies, setPolicies] = useState([]);
    const [terasItems, setTerasItems] = useState([]);
    const [strategies, setStrategies] = useState([]);

    // State for tracking expansion
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [selectedTeras, setSelectedTeras] = useState(null);

    // State for "Add New" forms
    const [newPolicyName, setNewPolicyName] = useState('');
    const [newTerasName, setNewTerasName] = useState('');
    const [newStrategyName, setNewStrategyName] = useState('');

    // State for the Edit Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // --- DATA FETCHING ---
    const fetchPolicies = useCallback(async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await api.get('/policies', { headers: { 'Authorization': `Bearer ${token}` } });
            setPolicies(response.data);
        } catch (error) { console.error("Failed to fetch policies:", error); }
    }, []);

    useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

    // --- EVENT HANDLERS ---
    const handlePolicySelect = async (policy) => {
        if (selectedPolicy?._id === policy._id) {
            setSelectedPolicy(null); setSelectedTeras(null);
        } else {
            setSelectedPolicy(policy); setSelectedTeras(null);
            try {
                const token = localStorage.getItem('authToken');
                const response = await api.get(`/teras?policyId=${policy._id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                setTerasItems(response.data);
            } catch (error) { console.error("Failed to fetch teras items:", error); }
        }
    };

    const handleTerasSelect = async (teras) => {
        if (selectedTeras?._id === teras._id) {
            setSelectedTeras(null);
        } else {
            setSelectedTeras(teras);
            try {
                const token = localStorage.getItem('authToken');
                const response = await api.get(`/strategies?terasId=${teras._id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                setStrategies(response.data);
            } catch (error) { console.error("Failed to fetch strategies:", error); }
        }
    };

    const handleAddPolicy = async (e) => {
        e.preventDefault(); if (!newPolicyName.trim()) return;
        try {
            const token = localStorage.getItem('authToken');
            await api.post('/policies', { name: newPolicyName }, { headers: { 'Authorization': `Bearer ${token}` } });
            setNewPolicyName(''); fetchPolicies();
        } catch (error) { Swal.fire('Error!', error.response?.data?.message || 'Failed to add policy.', 'error'); }
    };

    const handleAddTeras = async (e) => {
        e.preventDefault(); if (!newTerasName.trim() || !selectedPolicy) return;
        try {
            const token = localStorage.getItem('authToken');
            await api.post('/teras', { name: newTerasName, policy: selectedPolicy._id }, { headers: { 'Authorization': `Bearer ${token}` } });
            setNewTerasName(''); handlePolicySelect(selectedPolicy);
        } catch (error) { Swal.fire('Error!', error.response?.data?.message || 'Failed to add Teras.', 'error'); }
    };

    const handleAddStrategy = async (e) => {
        e.preventDefault(); if (!newStrategyName.trim() || !selectedTeras) return;
        try {
            const token = localStorage.getItem('authToken');
            await api.post('/strategies', { name: newStrategyName, teras: selectedTeras._id }, { headers: { 'Authorization': `Bearer ${token}` } });
            setNewStrategyName(''); handleTerasSelect(selectedTeras);
        } catch (error) { Swal.fire('Error!', error.response?.data?.message || 'Failed to add Strategy.', 'error'); }
    };

    const confirmDelete = (id, name, type) => {
        Swal.fire({
            title: 'Are you sure?', html: `This will permanently delete "<b>${name}</b>".<br>This action cannot be undone.`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                if (type === 'policy') deleteItem('policies', id, fetchPolicies);
                if (type === 'teras') deleteItem('teras', id, () => handlePolicySelect(selectedPolicy));
                if (type === 'strategy') deleteItem('strategies', id, () => handleTerasSelect(selectedTeras));
            }
        });
    };

    const deleteItem = async (endpoint, id, refreshFunction) => {
        try {
            const token = localStorage.getItem('authToken');
            await api.delete(`/${endpoint}/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            Swal.fire('Deleted!', 'The item has been deleted.', 'success');
            refreshFunction();
        } catch (error) { Swal.fire('Error!', error.response?.data?.message || 'Failed to delete item.', 'error'); }
    };

    const handleOpenEditModal = (item, type) => {
        setEditingItem({ ...item, type });
        setIsEditModalOpen(true);
    };

    const handleUpdateItem = async (itemId, updatedData) => {
        const { type } = editingItem;
        let endpoint = '';
        if (type === 'policy') endpoint = 'policies';
        if (type === 'teras') endpoint = 'teras';
        if (type === 'strategy') endpoint = 'strategies';

        try {
            const token = localStorage.getItem('authToken');
            await api.put(`/${endpoint}/${itemId}`, updatedData, { headers: { 'Authorization': `Bearer ${token}` } });
            Swal.fire('Updated!', 'The item has been updated.', 'success');
            setIsEditModalOpen(false);
            if (type === 'policy') fetchPolicies();
            if (type === 'teras') handlePolicySelect(selectedPolicy);
            if (type === 'strategy') handleTerasSelect(selectedTeras);
        } catch (error) { Swal.fire('Error!', error.response?.data?.message || 'Failed to update item.', 'error'); }
    };

    const handleDownload = async (policy) => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`http://localhost:3001/api/reports/download/${policy._id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Laporan_${policy.name}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error downloading report:', error);
            Swal.fire('Error!', 'Failed to download report.', 'error');
        }
    };

    const handleItemActions = (e, item, type) => {
        const target = e.target.closest('button');
        if (target?.classList.contains(`delete-${type}-btn`)) {
            e.stopPropagation(); confirmDelete(item._id, item.name, type);
        } else if (target?.classList.contains(`edit-${type}-btn`)) {
            e.stopPropagation(); handleOpenEditModal(item, type);
        } else if (target?.classList.contains(`download-${type}-btn`)) {
            e.stopPropagation(); handleDownload(item);
        } else {
            if (type === 'policy') handlePolicySelect(item);
            if (type === 'teras') handleTerasSelect(item);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">Dasar STEM</h1>
            <Card>
                <CardHeader><CardTitle>Pengurusan Dasar dan Polisi</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleAddPolicy} className="flex gap-2 mb-4 p-4 border rounded-lg">
                        <Input placeholder="Tambah Dasar/Polisi..." value={newPolicyName} onChange={(e) => setNewPolicyName(e.target.value)} />
                        <Button type="submit" size="icon" aria-label="Add Policy"><PlusIcon className="h-4 w-4" /></Button>
                    </form>

                    <div className="space-y-2">
                        {policies.map(policy => (
                            <div key={policy._id} className="border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                <div onClick={(e) => handleItemActions(e, policy, 'policy')} className="flex justify-between items-center p-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/40">
                                    <div className="flex items-center">
                                        {selectedPolicy?._id === policy._id ? <ChevronDownIcon className="h-5 w-5 mr-3 text-blue-500" /> : <ChevronRightIcon className="h-5 w-5 mr-3 text-blue-400" />}
                                        <span className="font-semibold text-blue-800 dark:text-blue-200">{policy.name}</span>
                                    </div>
                                    <ButtonGroup>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 download-policy-btn"><ArrowDownTrayIcon className="h-4 w-4" /></Button>
                                        <ButtonGroupSeparator />
                                        <Button variant="ghost" size="icon" className="h-8 w-8 edit-policy-btn"><PencilSquareIcon className="h-4 w-4" /></Button>
                                        <ButtonGroupSeparator />
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive delete-policy-btn"><TrashIcon className="h-4 w-4" /></Button>
                                    </ButtonGroup>
                                </div>

                                {selectedPolicy?._id === policy._id && (
                                    <div className="pl-8 pr-4 pb-4 space-y-2">
                                        <form onSubmit={handleAddTeras} className="flex gap-2 py-2">
                                            <Input placeholder="Tambah Teras..." value={newTerasName} onChange={(e) => setNewTerasName(e.target.value)} />
                                            <Button type="submit" size="icon" aria-label="Add Teras"><PlusIcon className="h-4 w-4" /></Button>
                                        </form>
                                        {terasItems.map(teras => (
                                            <div key={teras._id} className="border rounded-lg bg-green-50 dark:bg-green-900/20">
                                                <div onClick={(e) => handleItemActions(e, teras, 'teras')} className="flex justify-between items-center p-2 cursor-pointer hover:bg-green-100 dark:hover:bg-green-800/40">
                                                    <div className="flex items-center">
                                                        {selectedTeras?._id === teras._id ? <ChevronDownIcon className="h-4 w-4 mr-3 text-green-500" /> : <ChevronRightIcon className="h-4 w-4 mr-3 text-green-400" />}
                                                        <span className="text-green-800 dark:text-green-200">{teras.name}</span>
                                                    </div>
                                                    <ButtonGroup>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 edit-teras-btn"><PencilSquareIcon className="h-4 w-4" /></Button>
                                                        <ButtonGroupSeparator />
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive delete-teras-btn"><TrashIcon className="h-4 w-4" /></Button>
                                                    </ButtonGroup>
                                                </div>
                                                {selectedTeras?._id === teras._id && (
                                                    <div className="pl-8 pr-4 pb-4 space-y-2">
                                                        <form onSubmit={handleAddStrategy} className="flex gap-2 py-2">
                                                            <Input placeholder="Tambah Strategi..." value={newStrategyName} onChange={(e) => setNewStrategyName(e.target.value)} />
                                                            <Button type="submit" size="icon" aria-label="Add Strategy"><PlusIcon className="h-4 w-4" /></Button>
                                                        </form>
                                                        {strategies.map(strategy => (
                                                            <div key={strategy._id} onClick={(e) => handleItemActions(e, strategy, 'strategy')} className="flex justify-between items-center p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-800/40">
                                                                <span className="text-yellow-800 dark:text-yellow-200">{strategy.name}</span>
                                                                <ButtonGroup>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 edit-strategy-btn"><PencilSquareIcon className="h-4 w-4" /></Button>
                                                                    <ButtonGroupSeparator />
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive delete-strategy-btn"><TrashIcon className="h-4 w-4" /></Button>
                                                                </ButtonGroup>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <EditItemModal
                item={editingItem}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleUpdateItem}
            />
        </div>
    );
}

export default StrategicPlanning;