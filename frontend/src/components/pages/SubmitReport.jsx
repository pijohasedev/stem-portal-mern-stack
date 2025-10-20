import api from '@/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom'; // ✅ Tambah baris ni
import Swal from 'sweetalert2';


function SubmitReport({ reportToEdit, onReportSubmitted }) {
    const [initiatives, setInitiatives] = useState([]);
    const [selectedInitiative, setSelectedInitiative] = useState(null);
    const [period, setPeriod] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [summary, setSummary] = useState('');
    const [challenges, setChallenges] = useState('');
    const [nextSteps, setNextSteps] = useState('');
    const [adminFeedback, setAdminFeedback] = useState('');
    const [loading, setLoading] = useState(false);

    // ✅ Tambah bahagian ini di sini:
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const preselectedInitiativeId = queryParams.get('initiativeId');


    const isEditMode = !!reportToEdit;

    useEffect(() => {
        const token = localStorage.getItem('authToken');

        if (isEditMode) {
            console.log('Edit Mode - Report to edit:', reportToEdit);

            // Pre-fill form with existing report data
            setPeriod(reportToEdit.period);
            setSummary(reportToEdit.summary);
            setChallenges(reportToEdit.challenges || '');
            setNextSteps(reportToEdit.nextSteps || '');
            setAdminFeedback(reportToEdit.adminFeedback || '');

            // Fetch full initiative details
            const initiativeId = typeof reportToEdit.initiative === 'object'
                ? reportToEdit.initiative._id
                : reportToEdit.initiative;

            api.get(`/initiatives/${initiativeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    setSelectedInitiative(res.data);
                    // Set current value from initiative
                    setCurrentValue(res.data.kpi.currentValue || 0);
                })
                .catch(error => {
                    console.error('Error fetching initiative:', error);
                    Swal.fire('Error', 'Failed to load initiative details', 'error');
                });

        } else {
            // Add Mode: Fetch user's active initiatives
            setLoading(true);

            api.get('/users/me/initiatives', {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    console.log('Fetched initiatives:', res.data);

                    const activeInitiatives = res.data.filter(
                        i => i.status !== 'Completed' && i.status !== 'Pending Acceptance'
                    );

                    setInitiatives(activeInitiatives);

                    // ✅ Auto-select initiative dari URL jika ada
                    if (preselectedInitiativeId) {
                        const found = activeInitiatives.find(i => i._id === preselectedInitiativeId);
                        if (found) {
                            console.log("Auto-selecting initiative:", found.name);
                            setSelectedInitiative(found);
                            setCurrentValue(found.kpi.currentValue || 0);
                        } else {
                            console.warn("⚠️ Initiative not found in list:", preselectedInitiativeId);
                        }
                    }
                })
                .catch(error => {
                    console.error('Error fetching initiatives:', error);
                    Swal.fire('Error', 'Failed to load initiatives', 'error');
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [reportToEdit, isEditMode]);

    const handleInitiativeChange = (value) => {
        const initiative = initiatives.find(i => i._id === value);
        setSelectedInitiative(initiative);

        // Set the current KPI value from selected initiative
        setCurrentValue(initiative?.kpi?.currentValue || 0);

        // Reset other fields when changing initiative
        setPeriod('');
        setSummary('');
        setChallenges('');
        setNextSteps('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!selectedInitiative) {
            Swal.fire('Error', 'Please select an initiative', 'error');
            return;
        }

        if (!currentValue || parseFloat(currentValue) < 0) {
            Swal.fire('Error', 'Please enter a valid current value', 'error');
            return;
        }

        const reportData = {
            initiativeId: selectedInitiative._id,
            period,
            summary,
            challenges: challenges || '',
            nextSteps: nextSteps || '',
            currentValue: parseFloat(currentValue)
        };

        console.log('Submitting report:', reportData);

        try {
            const token = localStorage.getItem('authToken');

            if (isEditMode) {
                // ✅ UPDATE: Resubmit after revision
                await api.put(`/reports/${reportToEdit._id}`, reportData, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                await Swal.fire({
                    title: 'Success!',
                    text: 'Your report has been resubmitted for review.',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });

                // Call callback to navigate back or refresh list
                if (onReportSubmitted) onReportSubmitted();

            } else {
                // ✅ CREATE: New report submission
                await api.post('/reports', reportData, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                await Swal.fire({
                    title: 'Success!',
                    text: 'Your report has been submitted successfully.',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });

                // Reset form for next submission
                setPeriod('');
                setSummary('');
                setChallenges('');
                setNextSteps('');
                setCurrentValue('');
                setSelectedInitiative(null);
            }

        } catch (error) {
            console.error('Error submitting report:', error);
            Swal.fire(
                'Error!',
                error.response?.data?.message || 'Failed to submit report.',
                'error'
            );
        }
    };

    const truncateText = (text, maxLength = 40) => {
        if (!text) return '';
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
    };

    const initiativeOptions = initiatives.map(i => ({
        value: i._id,
        label: <span title={i.name}>{truncateText(i.name, 150)}</span>,
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading initiatives...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mr-auto pl-2">
            <h1 className="text-3xl font-bold mb-4">
                {isEditMode ? 'Revise & Resubmit Report' : 'Submit Progress Report'}
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle>Report Details</CardTitle>
                    <CardDescription>
                        {isEditMode
                            ? `Editing report for "${selectedInitiative?.name || 'Loading...'}"`
                            : 'Select an initiative and fill in your progress update.'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {/* Admin Feedback Alert - Show only in edit mode with feedback */}
                    {isEditMode && adminFeedback && (
                        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-yellow-800">
                                        Admin Feedback
                                    </h3>
                                    <p className="mt-2 text-sm text-yellow-700">
                                        {adminFeedback}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Initiative Selection */}
                        <div>
                            <Label>Initiative</Label>
                            {isEditMode ? (
                                <Input
                                    value={selectedInitiative?.name || 'Loading...'}
                                    disabled
                                    className="bg-gray-50"
                                />
                            ) : (
                                <Combobox
                                    options={initiativeOptions}
                                    value={selectedInitiative?._id || ''}
                                    onSelect={handleInitiativeChange}
                                    placeholder="Select an initiative..."
                                    searchPlaceholder="Search initiatives..."
                                />
                            )}
                        </div>

                        {/* Form Fields - Show when initiative is selected */}
                        {selectedInitiative && (
                            <div className="space-y-6 animate-enter">
                                {/* KPI Info Display */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-blue-900 mb-2">KPI Information</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-blue-600">Target:</p>
                                            <p className="font-bold text-blue-900">
                                                {selectedInitiative.kpi.target} {selectedInitiative.kpi.unit}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-blue-600">Current Progress:</p>
                                            <p className="font-bold text-blue-900">
                                                {selectedInitiative.kpi.currentValue || 0} {selectedInitiative.kpi.unit}
                                                <span className="ml-2 text-xs text-blue-600">
                                                    ({((selectedInitiative.kpi.currentValue || 0) / selectedInitiative.kpi.target * 100).toFixed(1)}%)
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Period and Current Value */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label htmlFor="period">Reporting Period *</Label>
                                        <Select
                                            id="period"
                                            onValueChange={setPeriod}
                                            value={period}
                                            required
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a period..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Weekly">Weekly</SelectItem>
                                                <SelectItem value="Monthly">Monthly</SelectItem>
                                                <SelectItem value="Quarterly">Quarterly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="currentValue">
                                            New KPI Value ({selectedInitiative.kpi.unit}) *
                                        </Label>
                                        <Input
                                            id="currentValue"
                                            type="number"
                                            step="0.01"
                                            value={currentValue}
                                            onChange={e => setCurrentValue(e.target.value)}
                                            required
                                            placeholder={`Enter new ${selectedInitiative.kpi.unit} value`}
                                        />
                                    </div>
                                </div>

                                {/* Summary */}
                                <div>
                                    <Label htmlFor="summary">Progress Summary *</Label>
                                    <Textarea
                                        id="summary"
                                        value={summary}
                                        onChange={e => setSummary(e.target.value)}
                                        required
                                        placeholder="Summarize your key achievements for this period."
                                        rows={4}
                                    />
                                </div>

                                {/* Challenges */}
                                <div>
                                    <Label htmlFor="challenges">Challenges & Issues</Label>
                                    <Textarea
                                        id="challenges"
                                        value={challenges}
                                        onChange={e => setChallenges(e.target.value)}
                                        placeholder="(Optional) Describe any challenges you faced."
                                        rows={3}
                                    />
                                </div>

                                {/* Next Steps */}
                                <div>
                                    <Label htmlFor="nextSteps">Next Steps</Label>
                                    <Textarea
                                        id="nextSteps"
                                        value={nextSteps}
                                        onChange={e => setNextSteps(e.target.value)}
                                        placeholder="(Optional) Outline your plan for the next period."
                                        rows={3}
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="flex justify-end gap-3">
                                    {onReportSubmitted && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={onReportSubmitted}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    <Button type="submit">
                                        {isEditMode ? 'Resubmit Report' : 'Submit Report'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* No Initiatives Message */}
                        {!isEditMode && !loading && initiatives.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <p>No active initiatives assigned to you.</p>
                                <p className="text-sm mt-2">Please contact your administrator.</p>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default SubmitReport;