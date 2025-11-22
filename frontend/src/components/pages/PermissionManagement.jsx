import api from '@/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, RefreshCw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

const ALL_PAGES = [
    { id: 'dashboard', label: 'Dashboard (Utama/Owner)' },
    { id: 'users', label: 'Pengurusan Pengguna' },
    { id: 'planning', label: 'Perancangan Dasar (Admin)' },
    { id: 'initiatives', label: 'Senarai Inisiatif (Tree View)' },
    { id: 'reports', label: 'Pemantauan Laporan (Monitor)' },
    { id: 'submit-report', label: 'Hantar Laporan' },
    { id: 'report-history', label: 'Sejarah Laporan' },
    { id: 'report-details', label: 'Lihat Perincian Laporan' },
];

const ROLES = ['Admin', 'Bahagian', 'Negeri', 'PPD', 'User'];

function PermissionManagement() {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await api.get('/permissions', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const fetchedPermissions = res.data;
            const mergedPermissions = ROLES.map(role => {
                const existing = fetchedPermissions.find(p => p.role === role);
                return existing || { role: role, allowedPages: [] };
            });

            setPermissions(mergedPermissions);
            setHasChanges(false);
        } catch (error) {
            console.error("Error fetching permissions:", error);
            Swal.fire("Ralat", "Gagal memuatkan data kebenaran.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (roleName, pageId) => {
        setPermissions(prevPermissions => {
            return prevPermissions.map(perm => {
                if (perm.role === roleName) {
                    const newAllowedPages = perm.allowedPages.includes(pageId)
                        ? perm.allowedPages.filter(id => id !== pageId)
                        : [...perm.allowedPages, pageId];

                    return { ...perm, allowedPages: newAllowedPages };
                }
                return perm;
            });
        });
        setHasChanges(true);
    };

    // ✅ CRITICAL: Broadcast update kepada semua users
    const broadcastPermissionUpdate = () => {
        // Guna localStorage event untuk notify tabs lain
        const updateEvent = {
            type: 'PERMISSION_UPDATE',
            timestamp: new Date().toISOString()
        };

        localStorage.setItem('permissionUpdate', JSON.stringify(updateEvent));

        // Trigger custom event untuk current window
        window.dispatchEvent(new CustomEvent('permissionChanged', {
            detail: updateEvent
        }));

        console.log('📢 Permission update broadcasted');
    };

    const handleSave = async () => {
        setSaving(true);
        const token = localStorage.getItem('authToken');

        try {
            // Save semua permissions
            const promises = permissions.map(perm =>
                api.post('/permissions/update', {
                    role: perm.role,
                    allowedPages: perm.allowedPages
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            );

            await Promise.all(promises);

            // ✅ BROADCAST UPDATE - Notify all users
            broadcastPermissionUpdate();

            setHasChanges(false);

            await Swal.fire({
                icon: "success",
                title: "Berjaya!",
                html: `
                    <p>Tetapan kebenaran telah disimpan.</p>
                    <p class="text-sm text-gray-600 mt-2">
                        Pengguna yang sedang login akan menerima kemaskini secara automatik.
                    </p>
                `,
                timer: 3000,
                timerProgressBar: true
            });

            console.log('✅ Permissions saved and broadcasted successfully');

        } catch (error) {
            console.error("Error saving permissions:", error);
            Swal.fire("Ralat", "Gagal menyimpan perubahan.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleRefresh = async () => {
        setLoading(true);
        await fetchPermissions();
        Swal.fire({
            icon: "info",
            title: "Dikemas kini!",
            text: "Data kebenaran telah dimuat semula.",
            timer: 1500
        });
    };

    const isAllowed = (roleName, pageId) => {
        const rolePerm = permissions.find(p => p.role === roleName);
        return rolePerm ? rolePerm.allowedPages.includes(pageId) : false;
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-muted-foreground">Memuatkan Matriks...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Matriks Kebenaran Akses</h1>
                    <p className="text-muted-foreground">
                        Tentukan halaman mana yang boleh diakses oleh setiap peranan.
                        {hasChanges && (
                            <span className="inline-flex items-center gap-1 text-orange-500 ml-2">
                                <Bell className="h-3 w-3" />
                                Ada perubahan yang belum disimpan
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleRefresh}
                        variant="outline"
                        disabled={saving || loading}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Muat Semula
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="relative"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        {hasChanges && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full animate-pulse" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Warning Banner */}
            {hasChanges && (
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-start gap-3">
                    <Bell className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                            Perubahan Belum Disimpan
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                            Klik <strong>Simpan Perubahan</strong> untuk menguatkuasakan tetapan baru.
                            Perubahan akan berkuatkuasa serta-merta untuk semua pengguna yang login.
                        </p>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Konfigurasi Akses</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px] sticky left-0 bg-white dark:bg-slate-950 z-10">
                                        Halaman / Modul
                                    </TableHead>
                                    {ROLES.map(role => (
                                        <TableHead
                                            key={role}
                                            className="text-center bg-slate-50 dark:bg-slate-900 font-bold min-w-[120px]"
                                        >
                                            {role}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ALL_PAGES.map(page => (
                                    <TableRow key={page.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <TableCell className="font-medium sticky left-0 bg-white dark:bg-slate-950 z-10">
                                            {page.label}
                                            <div className="text-[10px] text-muted-foreground font-mono mt-1">
                                                {page.id}
                                            </div>
                                        </TableCell>
                                        {ROLES.map(role => (
                                            <TableCell key={role} className="text-center">
                                                <div className="flex justify-center">
                                                    <Checkbox
                                                        checked={isAllowed(role, page.id)}
                                                        onCheckedChange={() => handleToggle(role, page.id)}
                                                        disabled={role === 'Admin' && page.id === 'dashboard'}
                                                    />
                                                </div>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Legend */}
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                            <strong>Nota:</strong> Admin sentiasa mempunyai akses penuh kepada semua halaman.
                            Checkbox yang disabled menunjukkan tetapan yang tidak boleh diubah untuk mengelakkan admin terkunci daripada sistem.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default PermissionManagement;