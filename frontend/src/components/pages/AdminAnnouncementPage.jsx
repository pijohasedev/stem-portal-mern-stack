import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Megaphone, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

function AdminAnnouncementPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create", "edit", "view"
    const [selectedId, setSelectedId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        title: "",
        message: "",
        priority: "Normal",
        targetRoles: []
    });

    const roleOptions = ["PPD", "JPN", "Bahagian", "Negeri", "User"];

    // Fetch History
    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await api.get('/announcements/all', {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setHistory(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    // --- HANDLERS ---

    const handleOpenCreate = () => {
        setFormData({ title: "", message: "", priority: "Normal", targetRoles: [] });
        setModalMode("create");
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setFormData({
            title: item.title,
            message: item.message,
            priority: item.priority,
            targetRoles: item.targetRoles
        });
        setSelectedId(item._id);
        setModalMode("edit");
        setIsModalOpen(true);
    };

    const handleOpenView = (item) => {
        setFormData({
            title: item.title,
            message: item.message,
            priority: item.priority,
            targetRoles: item.targetRoles
        });
        setModalMode("view");
        setIsModalOpen(true);
    };

    const handleToggleRole = (role) => {
        if (modalMode === 'view') return;
        setFormData(prev => {
            const roles = prev.targetRoles.includes(role)
                ? prev.targetRoles.filter(r => r !== role)
                : [...prev.targetRoles, role];
            return { ...prev, targetRoles: roles };
        });
    };

    const handleSelectAll = () => {
        if (modalMode === 'view') return;
        if (formData.targetRoles.length === roleOptions.length) {
            setFormData({ ...formData, targetRoles: [] });
        } else {
            setFormData({ ...formData, targetRoles: roleOptions });
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Padam Pengumuman?',
            text: "Tindakan ini tidak boleh diundur!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Padam',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('authToken');
                await api.delete(`/announcements/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire("Selesai", "Pengumuman telah dipadam.", "success");
                fetchHistory();
            } catch (error) {
                Swal.fire("Ralat", "Gagal memadam data.", "error");
            }
        }
    };

    const handleSubmit = async () => {
        if (modalMode === 'view') {
            setIsModalOpen(false);
            return;
        }

        if (!formData.title || !formData.message || formData.targetRoles.length === 0) {
            setIsModalOpen(false);
            setTimeout(() => {
                Swal.fire({
                    title: "Medan Wajib",
                    text: "Sila isi Tajuk, Mesej dan pilih sekurang-kurangnya satu Sasaran.",
                    icon: "warning",
                    confirmButtonText: "OK"
                }).then(() => setIsModalOpen(true));
            }, 100);
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('authToken');

            if (modalMode === 'create') {
                await api.post('/announcements', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else if (modalMode === 'edit') {
                await api.put(`/announcements/${selectedId}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setIsModalOpen(false);
            fetchHistory();

            setTimeout(() => {
                Swal.fire("Berjaya", modalMode === 'create' ? "Pengumuman dihantar." : "Pengumuman dikemaskini.", "success");
            }, 100);

        } catch (error) {
            console.error(error);
            setIsModalOpen(false);
            setTimeout(() => {
                Swal.fire("Ralat", "Gagal menyimpan pengumuman.", "error").then(() => setIsModalOpen(true));
            }, 100);
        } finally {
            setIsSaving(false);
        }
    };

    const isReadOnly = modalMode === 'view';

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                        <Megaphone className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pengurusan Pengumuman</h1>
                        <p className="text-muted-foreground">Hantar dan urus notifikasi kepada pengguna sistem.</p>
                    </div>
                </div>
                <Button onClick={handleOpenCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <PlusCircle className="h-4 w-4" /> Pengumuman Baru
                </Button>
            </div>

            {/* TABLE SENARAI */}
            <Card className="shadow-md border-slate-200">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100 border-b border-slate-200">
                                <TableHead className="w-[50px] text-center font-bold text-slate-700">Bil.</TableHead>
                                <TableHead className="font-bold text-slate-700">Tajuk & Mesej</TableHead>
                                <TableHead className="w-[150px] font-bold text-slate-700">Sasaran</TableHead>
                                <TableHead className="w-[100px] text-center font-bold text-slate-700">Prioriti</TableHead>
                                <TableHead className="w-[120px] text-center font-bold text-slate-700">Tarikh</TableHead>
                                <TableHead className="w-[100px] text-right font-bold text-slate-700 pr-6">Bacaan</TableHead>
                                <TableHead className="w-[120px] text-center font-bold text-slate-700">Tindakan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-500">Memuatkan...</TableCell></TableRow>
                            ) : history.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">Tiada pengumuman direkodkan.</TableCell></TableRow>
                            ) : (
                                history.map((item, index) => (
                                    <TableRow key={item._id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                        <TableCell className="text-center font-medium text-slate-500 align-top py-4">{index + 1}</TableCell>

                                        <TableCell className="align-top py-4">
                                            <div className="font-bold text-slate-900">{item.title}</div>
                                            <div className="text-sm text-slate-500 line-clamp-2 mt-1">{item.message}</div>
                                        </TableCell>

                                        <TableCell className="align-top py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {item.targetRoles.map(r => (
                                                    <Badge key={r} variant="outline" className="text-[10px] bg-white border-slate-200">
                                                        {r}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center align-top py-4">
                                            <Badge className={`${item.priority === 'High' ? 'bg-red-100 text-red-700 hover:bg-red-200' : item.priority === 'Low' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} border-0`}>
                                                {item.priority}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-center text-sm align-top py-4 text-slate-600">
                                            {new Date(item.createdAt).toLocaleDateString('en-GB')}
                                        </TableCell>

                                        <TableCell className="text-right align-top py-4 font-mono text-xs pr-6">
                                            {item.readBy?.length || 0}
                                        </TableCell>

                                        {/* ACTIONS */}
                                        <TableCell className="text-center align-top py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleOpenView(item)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-orange-600 hover:bg-orange-50" onClick={() => handleOpenEdit(item)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item._id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* MODAL FORM */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {modalMode === 'create' ? "Buat Pengumuman Baru" : modalMode === 'edit' ? "Kemaskini Pengumuman" : "Maklumat Pengumuman"}
                        </DialogTitle>
                        <DialogDescription>
                            {modalMode === 'view' ? "Paparan terperinci notifikasi." : "Isi maklumat di bawah untuk menghantar notifikasi."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Tajuk</Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                disabled={isReadOnly}
                                placeholder="Contoh: Penyelenggaraan Sistem"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Mesej</Label>
                            <Textarea
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                disabled={isReadOnly}
                                placeholder="Isi kandungan pengumuman..."
                                rows={5}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Kepentingan (Priority)</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={v => setFormData({ ...formData, priority: v })}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Rendah (Info)</SelectItem>
                                    <SelectItem value="Normal">Biasa</SelectItem>
                                    <SelectItem value="High">Tinggi (Penting)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3 border p-3 rounded bg-slate-50">
                            <div className="flex justify-between items-center">
                                <Label className="font-bold">Sasaran Penerima</Label>
                                {!isReadOnly && (
                                    <Button type="button" variant="link" size="sm" onClick={handleSelectAll} className="h-auto p-0 text-xs">
                                        Pilih Semua
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {roleOptions.map(role => (
                                    <div key={role} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`role-${role}`}
                                            checked={formData.targetRoles.includes(role)}
                                            onCheckedChange={() => handleToggleRole(role)}
                                            disabled={isReadOnly}
                                        />
                                        <label htmlFor={`role-${role}`} className="text-sm font-medium cursor-pointer">
                                            {role}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            {isReadOnly ? "Tutup" : "Batal"}
                        </Button>
                        {!isReadOnly && (
                            <Button onClick={handleSubmit} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                                {isSaving ? "Menyimpan..." : "Simpan"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

export default AdminAnnouncementPage;