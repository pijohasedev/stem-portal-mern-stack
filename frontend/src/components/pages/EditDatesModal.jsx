import api from '@/api';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
};

function EditDatesModal({ initiative, isOpen, onClose, onDatesUpdated }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (initiative) {
            setStartDate(formatDateForInput(initiative.startDate));
            setEndDate(formatDateForInput(initiative.endDate));
        }
    }, [initiative]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('authToken');
            await api.patch(`/initiatives/${initiative._id}/dates`,
                { startDate, endDate },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            // Tutup modal dulu sebelum tunjuk Swal
            onClose();

            // Tunjuk popup selepas modal ditutup
            setTimeout(() => {
                Swal.fire({
                    title: 'Success!',
                    text: 'Initiative dates have been updated.',
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then(() => {
                    onDatesUpdated();
                });
            }, 200);

        } catch (error) {
            Swal.fire('Error!', error.response?.data?.message || 'Failed to update dates.', 'error');
        }
    };

    if (!isOpen || !initiative) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Initiative Dates</DialogTitle>
                    <DialogDescription>Adjust the timeline for "{initiative.name}".</DialogDescription>
                </DialogHeader>
                <form id="edit-dates-form" onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="start-date-edit">Start Date</Label>
                            <Input id="start-date-edit" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                        </div>
                        <div>
                            <Label htmlFor="end-date-edit">End Date</Label>
                            <Input id="end-date-edit" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                        </div>
                    </div>
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="edit-dates-form">Save Dates</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default EditDatesModal;