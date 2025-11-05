import api from '@/api';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from 'react';
import Swal from 'sweetalert2';

function PlanInitiativeModal({ initiative, isOpen, onClose, onAccepted }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('authToken');
            await api.patch(`/initiatives/${initiative._id}/accept`,
                { startDate, endDate },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            Swal.fire({
                title: 'Accepted!',
                text: 'The initiative is now in the planning stage.',
                icon: 'success'
            }).then(() => {
                onAccepted(); // Refresh the main list after the user clicks "OK"
                onClose();    // Close the modal
            });

        } catch (error) {
            Swal.fire('Error!', error.response?.data?.message || 'Failed to accept initiative.', 'error');
        }
    };

    if (!isOpen || !initiative) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Terima dan Rancang Inisiatif</DialogTitle>
                    <DialogDescription>Tentukan tarikh mula dan tamat inisiatif "{initiative.name}".</DialogDescription>
                </DialogHeader>
                <form id="plan-initiative-form" onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="start-date">Tarikh Mula</Label>
                            <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                        </div>
                        <div>
                            <Label htmlFor="end-date">Tarikh Tamat</Label>
                            <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                        </div>
                    </div>
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                    <Button type="submit" form="plan-initiative-form">Terima & Simpan</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default PlanInitiativeModal;