import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Send } from "lucide-react";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

function AdminAnnouncementPage() {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [priority, setPriority] = useState("Normal");
    const [targets, setTargets] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const roleOptions = ["PPD", "JPN", "Bahagian", "Negeri", "User"];

    // Fetch History
    const fetchHistory = async () => {
        try {
            const res = await api.get('/announcements/all', {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setHistory(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    const handleToggleRole = (role) => {
        setTargets(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const handleSelectAll = () => {
        if (targets.length === roleOptions.length) setTargets([]);
        else setTargets(roleOptions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (targets.length === 0) {
            Swal.fire("Ralat", "Sila pilih sekurang-kurangnya satu sasaran penerima.", "warning");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            await api.post('/announcements', {
                title, message, targetRoles: targets, priority
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire("Berjaya", "Pengumuman telah dihantar.", "success");
            setTitle("");
            setMessage("");
            setTargets([]);
            fetchHistory();
        } catch (error) {
            Swal.fire("Ralat", "Gagal menghantar pengumuman.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                    <Megaphone className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pengurusan Pengumuman</h1>
                    <p className="text-muted-foreground">Hantar notifikasi kepada pengguna sistem.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* FORM */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader><CardTitle>Buat Pengumuman Baru</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Tajuk</Label>
                                <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Contoh: Penyelenggaraan Sistem" />
                            </div>

                            <div className="space-y-2">
                                <Label>Mesej</Label>
                                <Textarea value={message} onChange={e => setMessage(e.target.value)} required placeholder="Isi kandungan pengumuman..." rows={4} />
                            </div>

                            <div className="space-y-2">
                                <Label>Kepentingan (Priority)</Label>
                                <Select value={priority} onValueChange={setPriority}>
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
                                    <Button type="button" variant="link" size="sm" onClick={handleSelectAll} className="h-auto p-0">
                                        Pilih Semua
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {roleOptions.map(role => (
                                        <div key={role} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`role-${role}`}
                                                checked={targets.includes(role)}
                                                onCheckedChange={() => handleToggleRole(role)}
                                            />
                                            <label htmlFor={`role-${role}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                                {role}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button type="submit" className="w-full gap-2" disabled={loading}>
                                <Send className="h-4 w-4" /> {loading ? "Menghantar..." : "Hantar Pengumuman"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* HISTORY LIST */}
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Sejarah Pengumuman</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tajuk</TableHead>
                                    <TableHead>Sasaran</TableHead>
                                    <TableHead>Tarikh</TableHead>
                                    <TableHead className="text-right">Bacaan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-8">Tiada rekod.</TableCell></TableRow>
                                ) : history.map(item => (
                                    <TableRow key={item._id}>
                                        <TableCell>
                                            <div className="font-medium">{item.title}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.message}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {item.targetRoles.map(r => <Badge key={r} variant="outline" className="text-[10px] px-1 py-0">{r}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {item.readBy?.length || 0} klik
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default AdminAnnouncementPage;