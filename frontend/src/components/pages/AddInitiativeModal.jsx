import api from '@/api';
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

function AddInitiativeModal({ isOpen, onClose, onInitiativeAdded, initiativeToEdit }) {
    // State for dropdown data
    const [policies, setPolicies] = useState([]);
    const [terasItems, setTerasItems] = useState([]);
    const [strategies, setStrategies] = useState([]);
    const [assignees, setAssignees] = useState([]);

    // State for form fields
    const [selectedPolicy, setSelectedPolicy] = useState('');
    const [selectedTeras, setSelectedTeras] = useState('');
    const [selectedStrategy, setSelectedStrategy] = useState('');
    const [initiativeName, setInitiativeName] = useState('');
    const [kpiTarget, setKpiTarget] = useState('');
    const [kpiUnit, setKpiUnit] = useState('');
    const [selectedAssignees, setSelectedAssignees] = useState([]);

    const isEditMode = !!initiativeToEdit;

    // This effect runs when the modal opens
    useEffect(() => {
        if (isOpen) {
            const token = localStorage.getItem('authToken');
            const headers = { headers: { Authorization: `Bearer ${token}` } };

            api.get('/users/owners', headers).then(res => setAssignees(res.data));

            if (initiativeToEdit) {
                // Edit Mode: Pre-fill form
                setInitiativeName(initiativeToEdit.name);
                setKpiTarget(initiativeToEdit.kpi.target);
                setKpiUnit(initiativeToEdit.kpi.unit);
                setSelectedAssignees(initiativeToEdit.assignees.map(a => a._id));
                // Note: Pre-filling cascading dropdowns is more complex and will be a future step.
            } else {
                // Add Mode: Reset everything and fetch initial policies
                setInitiativeName(''); setKpiTarget(''); setKpiUnit(''); setSelectedAssignees([]);
                setSelectedPolicy(''); setSelectedTeras(''); setSelectedStrategy('');
                api.get('/policies', headers).then(res => setPolicies(res.data));
            }
        }
    }, [isOpen, initiativeToEdit]);

    const handlePolicyChange = async (policyId) => {
        setSelectedPolicy(policyId);
        setSelectedTeras('');
        setSelectedStrategy('');
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

    const handleSubmit = async () => {
        const initiativeData = {
            name: initiativeName,
            assignees: selectedAssignees,
            kpi: { target: kpiTarget, unit: kpiUnit },
            strategy: isEditMode ? initiativeToEdit.strategy : selectedStrategy,
            ...((!isEditMode) && { status: 'pending acceptance' })
        };

        try {
            const token = localStorage.getItem('authToken');
            if (isEditMode) {
                await api.put(`/initiatives/${initiativeToEdit._id}`, initiativeData, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Success!', 'Initiative updated successfully.', 'success');
            } else {
                await api.post('/initiatives', initiativeData, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire('Success!', 'Initiative created successfully.', 'success');
            }
            onInitiativeAdded();
            onClose();
        } catch (error) {
            Swal.fire('Error!', error.response?.data?.message || 'Request failed.', 'error');
        }
    };

    if (!isOpen) return null;

    // Format data for the comboboxes
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
                    {!isEditMode && (
                        <div className="space-y-4">
                            <div>
                                <Label>1. Dasar/Polisi</Label>
                                <Combobox
                                    options={policyOptions}
                                    value={selectedPolicy}
                                    onSelect={handlePolicyChange}
                                    placeholder="Pilih Dasar/Polisi..."
                                    searchPlaceholder="Cari Dasar/Polisi..."
                                />
                            </div>
                            <div className={!selectedPolicy ? 'hidden' : ''}>
                                <Label>2. Teras</Label>
                                <Combobox
                                    options={terasOptions}
                                    value={selectedTeras}
                                    onSelect={handleTerasChange}
                                    placeholder="Pilih Teras..."
                                    searchPlaceholder="Cari teras..."
                                />
                            </div>
                            <div className={!selectedTeras ? 'hidden' : ''}>
                                <Label>3. Strategi</Label>
                                <Combobox
                                    options={strategyOptions}
                                    value={selectedStrategy}
                                    onSelect={setSelectedStrategy}
                                    placeholder="Pilih Strategi..."
                                    searchPlaceholder="Cari strategi..."
                                />
                            </div>
                        </div>
                    )}

                    {(isEditMode || selectedStrategy) && (
                        <div className={isEditMode ? '' : 'pt-4 border-t'}>
                            <div className="space-y-4">
                                <div><Label htmlFor="initiativeName">Nama Inisiatif</Label><Input id="initiativeName" value={initiativeName} onChange={e => setInitiativeName(e.target.value)} required /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label htmlFor="kpiTarget">Sasaran KPI</Label><Input id="kpiTarget" type="number" value={kpiTarget} onChange={e => setKpiTarget(e.target.value)} placeholder="cth. 85" required /></div>
                                    <div><Label htmlFor="kpiUnit">KPI Unit</Label><Input id="kpiUnit" value={kpiUnit} onChange={e => setKpiUnit(e.target.value)} placeholder="cth. %, Projek, Program dll" required /></div>
                                </div>
                                <div>
                                    <Label>Ditugaskan kepada</Label>
                                    <Select onValueChange={(value) => setSelectedAssignees([value])} value={selectedAssignees[0] || ''} required>
                                        <SelectTrigger><SelectValue placeholder="Pilih PIC Bahagian..." /></SelectTrigger>
                                        <SelectContent>{assignees.map(a => <SelectItem key={a._id} value={a._id}>{a.firstName} {a.lastName}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
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