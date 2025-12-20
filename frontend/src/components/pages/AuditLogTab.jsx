import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from 'react';

function AuditLogTab() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('authToken');
                // ✅ PEMBETULAN: Tukar endpoint ke '/logs' supaya sama dengan server.js
                const response = await api.get('/logs', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Logik pemilihan data (Kekalkan)
                if (response.data.logs && Array.isArray(response.data.logs)) {
                    setLogs(response.data.logs);
                } else if (Array.isArray(response.data)) {
                    setLogs(response.data);
                } else {
                    setLogs([]);
                }

            } catch (error) {
                console.error("Gagal memuatkan log audit:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString('ms-MY', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-0 pt-0">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-orange-600" />
                    <CardTitle>Jejak Audit (Audit Trail)</CardTitle>
                </div>
                <CardDescription>
                    Rekod aktiviti terkini yang berlaku dalam sistem.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                <div className="rounded-md border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[180px]">Masa</TableHead>
                                <TableHead>Pengguna</TableHead>
                                <TableHead>Aktiviti</TableHead>
                                <TableHead>Keterangan</TableHead>
                                <TableHead className="text-right">IP Address</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Memuatkan rekod...</TableCell></TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Tiada rekod ditemui.</TableCell></TableRow>
                            ) : (
                                logs.map((log, index) => {
                                    const userObj = log.performedBy || log.user;
                                    const timeVal = log.timestamp || log.createdAt;
                                    const descVal = log.details || log.description;
                                    const ipVal = log.ip || log.ipAddress || '-';

                                    return (
                                        <TableRow key={log._id || index}>
                                            <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                                                {formatDate(timeVal)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm text-slate-900">
                                                    {userObj ? `${userObj.firstName} ${userObj.lastName}` : 'Sistem / Unknown'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {userObj?.email || userObj?.role || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={log.action === 'LOGIN' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600 max-w-[300px] truncate" title={descVal}>
                                                {descVal}
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-mono text-muted-foreground">
                                                {ipVal}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

export default AuditLogTab;