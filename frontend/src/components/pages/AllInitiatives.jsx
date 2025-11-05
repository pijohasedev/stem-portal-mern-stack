import api from '@/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import {
    CalendarDaysIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    PencilSquareIcon,
    PlusIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import AddInitiativeModal from './AddInitiativeModal';
import EditDatesModal from './EditDatesModal';

function AllInitiatives() {
    const [treeData, setTreeData] = useState([]);
    const [totals, setTotals] = useState({ policies: 0, teras: 0, strategies: 0, initiatives: 0 });
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInitiative, setEditingInitiative] = useState(null);
    const [isDatesModalOpen, setIsDatesModalOpen] = useState(false);

    const fetchTree = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await api.get('/tree/initiatives', { headers: { 'Authorization': `Bearer ${token}` } });
            setTreeData(response.data.tree);
            setTotals(response.data.totals);
        } catch (error) {
            console.error("Failed to fetch initiative tree:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTree();
    }, [fetchTree]);

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleOpenAddModal = () => {
        setEditingInitiative(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (initiative) => {
        setEditingInitiative(initiative);
        setIsModalOpen(true);
    };

    const handleOpenDatesModal = (initiative) => {
        setEditingInitiative(initiative);
        setIsDatesModalOpen(true);
    };

    const confirmDeleteInitiative = (initiative) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `This will permanently delete "${initiative.name}". This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteInitiative(initiative._id);
            }
        });
    };

    const deleteInitiative = async (initiativeId) => {
        try {
            const token = localStorage.getItem('authToken');
            await api.delete(`/initiatives/${initiativeId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            Swal.fire('Deleted!', 'The initiative has been deleted.', 'success');
            fetchTree();
        } catch (error) {
            Swal.fire('Error!', error.response?.data?.message || 'Failed to delete initiative.', 'error');
        }
    };

    const getStatusStyles = (status) => {
        // This function now just returns the color classes
        switch (status) {
            case 'Active':
                return 'bg-green-800 text-white dark:bg-green-900/40 dark:text-green-200 border-green-200 dark:border-green-800';
            case 'Planning':
                return 'bg-yellow-800 text-white dark:bg-yellow-900/40 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
            case 'At Risk':
                return 'bg-red-800 text-white dark:bg-red-900/40 dark:text-red-200 border-red-200 dark:border-red-800';
            case 'Completed':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200 dark:border-blue-800';
            default: // Pending Acceptance
                return 'border-border'; // Use the default border color for a neutral look
        }
    };

    const renderTreeRows = (items, type, level = 0) => {
        let rows = [];
        if (!items || items.length === 0) {
            // Meaningful Empty State for sub-levels
            if (level > 0) {
                rows.push(
                    <TableRow key={`empty-${level}`} className="animate-enter">
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-4" style={{ paddingLeft: `${level * 24 + 12}px` }}>
                            No {type}s found.
                        </TableCell>
                    </TableRow>
                );
            }
            return rows;
        }

        items.forEach(item => {
            const isExpanded = !!expandedRows[item._id];
            const children =
                type === 'policy'
                    ? item.teras || []
                    : type === 'teras'
                        ? item.strategies || []
                        : type === 'strategy'
                            ? item.initiatives || []
                            : [];


            if (type !== 'initiative') {
                let hierarchyClasses = 'cursor-pointer transition-colors';
                let iconColor = 'text-gray-400';
                let textColor = 'font-semibold';

                if (type === 'policy') {
                    hierarchyClasses += ' bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/40';
                    iconColor = isExpanded ? 'text-blue-500' : 'text-blue-400';
                    textColor += ' text-blue-800 dark:text-blue-200';
                }
                if (type === 'teras') {
                    hierarchyClasses += ' bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-800/40';
                    iconColor = isExpanded ? 'text-green-500' : 'text-green-400';
                    textColor += ' text-green-800 dark:text-green-200';
                }
                if (type === 'strategy') {
                    hierarchyClasses += ' bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-800/40';
                    iconColor = isExpanded ? 'text-yellow-500' : 'text-yellow-400';
                    textColor += ' text-yellow-800 dark:text-yellow-200';
                }

                rows.push(
                    <TableRow key={item._id} onClick={() => toggleRow(item._id)} className={hierarchyClasses}>
                        <TableCell colSpan={5} style={{ paddingLeft: `${level * 24 + 12}px` }}>
                            <div className="flex items-center gap-2">
                                {children && children.length > 0 ? (
                                    isExpanded ? <ChevronDownIcon className={`h-5 w-5 ${iconColor}`} /> : <ChevronRightIcon className={`h-5 w-5 ${iconColor}`} />
                                ) : <div className="w-5 h-5"></div>}
                                <span className={textColor}>{item.name}</span>
                            </div>
                        </TableCell>
                    </TableRow>
                );
            } else {
                let statusVariant = 'secondary';
                if (item.status === 'Active') statusVariant = 'default';
                if (item.status === 'Completed') statusVariant = 'outline';
                if (item.status === 'At Risk') statusVariant = 'destructive';

                rows.push(
                    <TableRow key={item._id}>
                        <TableCell style={{ paddingLeft: `${level * 24 + 24}px` }}>{item.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.assignees.map(a => a.firstName).join(', ')}</TableCell>
                        <TableCell className="align-middle"><Badge variant="outline" className={cn("font-semibold", getStatusStyles(item.status))}>{item.status}</Badge></TableCell>

                        <TableCell className="text-sm">{`${item.kpi.currentValue || 0} / ${item.kpi.target} ${item.kpi.unit}`}</TableCell>
                        <TableCell className="text-right">
                            <ButtonGroup>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditModal(item)}><PencilSquareIcon className="h-4 w-4" /></Button>
                                <ButtonGroupSeparator />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDatesModal(item)}><CalendarDaysIcon className="h-4 w-4" /></Button>
                                <ButtonGroupSeparator />
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => confirmDeleteInitiative(item)}><TrashIcon className="h-4 w-4" /></Button>
                            </ButtonGroup>
                        </TableCell>
                    </TableRow>
                );
            }

            if (isExpanded && children.length > 0) {
                let childType =
                    type === 'policy'
                        ? 'teras'
                        : type === 'teras'
                            ? 'strategy'
                            : 'initiative';

                const childRows = renderTreeRows(children, childType, level + 1);
                childRows.forEach((childRow) => {
                    rows.push(
                        React.cloneElement(childRow, {
                            ...childRow.props,
                            className: `${childRow.props.className || ''} animate-enter`,
                        })
                    );
                });
            }


        });
        return rows;
    };

    if (loading) {
        return <p className="text-center text-muted-foreground">Loading Strategic Plan...</p>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold">Senarai Inisiatif</h1>
                <Button onClick={handleOpenAddModal}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Tambah Inisiatif
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Jumlah Dasar/Polisi</CardTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4 text-muted-foreground"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{totals.policies}</div></CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/30 border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Jumlah Teras</CardTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4 text-muted-foreground"><path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" /></svg>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{totals.teras}</div></CardContent>
                </Card>
                <Card className="bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Jumlah Strategi</CardTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4 text-muted-foreground"><path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-2.25-1.313M21 7.5v2.25m0-2.25-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3 2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75 2.25-1.313M12 21.75V19.5m0 2.25-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" /></svg>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{totals.strategies}</div></CardContent>
                </Card>
                <Card className="bg-purple-50 dark:bg-purple-900/30 border-purple-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Jumlah Inisiatif</CardTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4 text-muted-foreground"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" /></svg>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{totals.initiatives}</div></CardContent>
                </Card>
            </div>

            <div className="bg-card rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/2">Dasar/Polisi</TableHead>
                            <TableHead>Bahagian</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>KPI</TableHead>
                            <TableHead className="text-right">Tindakan</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {treeData.length > 0 ? (
                            renderTreeRows(treeData, 'policy')
                        ) : (
                            <TableRow><TableCell colSpan={5} className="text-center h-24">No strategic plan found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AddInitiativeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onInitiativeAdded={fetchTree}
                initiativeToEdit={editingInitiative}
            />
            <EditDatesModal
                initiative={editingInitiative}
                isOpen={isDatesModalOpen}
                onClose={() => setIsDatesModalOpen(false)}
                onDatesUpdated={fetchTree}
            />
        </div>
    );
}

export default AllInitiatives;