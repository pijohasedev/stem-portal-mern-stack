const express = require('express');
const router = express.Router();
const Report = require('../models/report.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Initiative = require('../models/initiative.model');
const Strategy = require('../models/strategy.model');
const Teras = require('../models/teras.model');

// POST /api/reports - Create a new report
router.post('/', auth, async (req, res) => {
    try {
        const { initiativeId, period, summary, challenges, nextSteps, currentValue } = req.body;

        console.log('=== Creating Report ===');
        console.log('Request body:', req.body);
        console.log('User:', req.user);

        // Validation
        if (!initiativeId || !period || !summary || currentValue === undefined) {
            return res.status(400).json({
                message: 'Missing required fields: initiativeId, period, summary, and currentValue are required'
            });
        }

        // Find initiative
        const initiative = await Initiative.findById(initiativeId);
        if (!initiative) {
            console.error('Initiative not found for ID:', initiativeId);
            return res.status(404).json({ message: 'Initiative not found.' });
        }

        console.log('Found initiative:', initiative.name);
        console.log('Old KPI value:', initiative.kpi.currentValue);
        console.log('New KPI value:', currentValue);

        // Check if user is assigned to this initiative
        const userId = req.user._id || req.user.id;
        const isAssigned = initiative.assignees.some(
            assignee => assignee.toString() === userId.toString()
        );

        if (!isAssigned && req.user.role !== 'Admin') {
            return res.status(403).json({
                message: 'You are not assigned to this initiative.'
            });
        }

        // Calculate completion rate
        const completionRate = initiative.kpi.target > 0
            ? (parseFloat(currentValue) / initiative.kpi.target) * 100
            : 0;

        // Update initiative KPI
        initiative.kpi.currentValue = parseFloat(currentValue);

        if (initiative.kpi.currentValue >= initiative.kpi.target) {
            initiative.status = 'Completed';
            console.log('✓ Initiative marked as Completed');
        }

        initiative.lastReportDate = new Date();
        await initiative.save();
        console.log('✓ Initiative updated successfully');

        // Create report
        const newReport = new Report({
            initiative: initiativeId,
            owner: userId,
            period,
            summary,
            challenges: challenges || '',
            nextSteps: nextSteps || '',
            reportDate: new Date(),
            participants: 0,
            attendanceRate: 0,
            completionRate: completionRate,
            status: 'Pending Review'
        });

        await newReport.save();
        console.log('✓ Report created:', newReport._id);

        // Populate before sending
        await newReport.populate('owner', 'firstName lastName email');
        await newReport.populate('initiative', 'name status kpi');

        res.status(201).json({
            message: 'Report submitted and initiative updated successfully.',
            data: newReport
        });

    } catch (err) {
        console.error('Error creating report:', err);
        res.status(500).json({
            message: 'Server error creating report.',
            error: err.message
        });
    }
});

// GET /api/reports - Get all reports (admin only)
router.get('/', [auth, adminAuth], async (req, res) => {
    try {
        const reports = await Report.find()
            .sort({ createdAt: -1 })
            .populate('owner', 'firstName lastName email')
            .populate({
                path: 'initiative',
                select: 'name status kpi strategy',
                populate: {
                    path: 'strategy',
                    select: 'name teras',
                    populate: {
                        path: 'teras',
                        select: 'name policy',
                        populate: {
                            path: 'policy',
                            select: 'name'
                        }
                    }
                }
            });

        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Server error while fetching reports.' });
    }
});

// ✅ GET /api/reports/my-reports - Get user's own reports WITH POLICY INFO
router.get('/my-reports', auth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;

        console.log('=== Fetching reports for user:', userId, '===');

        // Step 1: Get reports with basic initiative info
        const reports = await Report.find({ owner: userId })
            .sort({ createdAt: -1 })
            .populate('initiative', 'name status kpi strategy')
            .lean();

        console.log(`✓ Found ${reports.length} reports`);

        // Step 2: Get all unique strategy IDs
        const strategyIds = reports
            .map(r => r.initiative?.strategy)
            .filter(Boolean);

        console.log(`  - Found ${strategyIds.length} unique strategies`);

        // Step 3: Fetch strategies with teras and policy
        const strategies = await Strategy.find({
            _id: { $in: strategyIds }
        })
            .populate({
                path: 'teras',
                select: 'name policy',
                populate: {
                    path: 'policy',
                    select: 'name'
                }
            })
            .lean();

        console.log(`  - Loaded ${strategies.length} strategies with policy info`);

        // Step 4: Create strategy map for quick lookup
        const strategyMap = {};
        strategies.forEach(s => {
            strategyMap[s._id.toString()] = s;
            if (s.teras?.policy) {
                console.log(`    Strategy "${s.name}" → Teras "${s.teras.name}" → Policy "${s.teras.policy.name}"`);
            }
        });

        // Step 5: Transform reports with policy info
        const reportsWithPolicy = reports.map(report => {
            let policyName = 'Unassigned Policy';
            let policyId = 'unassigned';

            if (report.initiative?.strategy) {
                const strategyId = report.initiative.strategy.toString();
                const strategy = strategyMap[strategyId];

                if (strategy?.teras?.policy) {
                    policyName = strategy.teras.policy.name;
                    policyId = strategy.teras.policy._id.toString();
                } else {
                    console.warn(`  ⚠️ Report "${report._id}" initiative "${report.initiative.name}" missing policy chain`);
                }
            }

            return {
                ...report,
                initiative: {
                    ...report.initiative,
                    policyName: policyName,
                    policyId: policyId
                }
            };
        });

        console.log('✓ Reports transformed with policy info\n');

        res.json(reportsWithPolicy);

    } catch (error) {
        console.error('Error fetching user reports:', error);
        res.status(500).json({
            message: 'Server error fetching reports.',
            error: error.message
        });
    }
});

// GET /api/reports/:id - Get single report
router.get('/:id', auth, async (req, res) => {
    try {
        console.log("📩 GET /reports/:id called, ID =", req.params.id);
        const report = await Report.findById(req.params.id)
            .populate('owner', 'firstName lastName email')
            .populate('initiative', 'name status kpi');

        console.log("🔍 Report found:", report ? "Yes" : "No");

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        // Authorization check
        const userId = req.user._id || req.user.id;
        const isOwner = report.owner._id.toString() === userId.toString();
        const isAdmin = req.user.role?.toLowerCase() === 'admin';

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(report);
    } catch (error) {
        console.error('❌ Error fetching report:', error);
        res.status(500).json({ message: 'Server error fetching report.' });
    }
});


// PATCH /api/reports/:id/approve - Approve report (admin only)
router.patch('/:id/approve', [auth, adminAuth], async (req, res) => {
    try {
        const report = await Report.findByIdAndUpdate(
            req.params.id,
            { status: 'Approved' },
            { new: true }
        )
            .populate('owner', 'firstName lastName')
            .populate('initiative', 'name');

        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        res.json({
            message: 'Report approved successfully.',
            report
        });
    } catch (error) {
        console.error('Error approving report:', error);
        res.status(500).json({ message: 'Server error approving report.' });
    }
});

// PATCH /api/reports/:id/status - Update a report's status
// ✅ PATCH /api/reports/:id/status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status, feedback } = req.body;

        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        // Update status dan feedback
        report.status = status || report.status;
        report.feedback = feedback || ''; // ✅ simpan feedback
        report.updatedAt = Date.now();

        await report.save();

        res.json({ message: 'Report updated successfully', report });
    } catch (error) {
        console.error('Error updating report status:', error);
        res.status(500).json({ message: 'Server error updating report status' });
    }
});


// PUT /api/reports/:id - Update/Resubmit report (after revision)
router.put('/:id', auth, async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        // Security: Only report owner can update
        const userId = req.user._id || req.user.id;
        if (report.owner.toString() !== userId.toString()) {
            return res.status(403).json({
                message: 'You are not authorized to update this report.'
            });
        }

        // Only allow updates if status is "Needs Revision"
        if (report.status !== 'Needs Revision') {
            return res.status(400).json({
                message: 'Only reports with "Needs Revision" status can be edited.'
            });
        }

        const { period, summary, challenges, nextSteps, currentValue } = req.body;

        console.log('=== Updating Report ===');
        console.log('Report ID:', req.params.id);
        console.log('Update data:', req.body);

        // Update report fields
        if (period) report.period = period;
        if (summary) report.summary = summary;
        if (challenges !== undefined) report.challenges = challenges;
        if (nextSteps !== undefined) report.nextSteps = nextSteps;

        // Update KPI if provided
        if (currentValue !== undefined) {
            const initiative = await Initiative.findById(report.initiative);

            if (initiative) {
                console.log('New initiative KPI:', currentValue);

                // Update initiative
                initiative.kpi.currentValue = parseFloat(currentValue);

                // Recalculate completion rate
                report.completionRate = initiative.kpi.target > 0
                    ? (parseFloat(currentValue) / initiative.kpi.target) * 100
                    : 0;

                // Check if completed
                if (initiative.kpi.currentValue >= initiative.kpi.target) {
                    initiative.status = 'Completed';
                    console.log('✓ Initiative marked as Completed');
                }

                await initiative.save();
                console.log('✓ Initiative updated');
            }
        }

        // Reset status to Pending Review
        report.status = 'Pending Review';
        report.adminFeedback = '';

        const updatedReport = await report.save();
        console.log('✓ Report updated:', updatedReport._id);

        // Populate before sending
        await updatedReport.populate('owner', 'firstName lastName email');
        await updatedReport.populate('initiative', 'name status kpi');

        res.json({
            message: 'Report updated and resubmitted successfully.',
            data: updatedReport
        });

    } catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({
            message: 'Server error while updating report.',
            error: error.message
        });
    }
});

// DELETE /api/reports/:id - Delete report
router.delete('/:id', auth, async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        // Only admin or owner can delete
        const userId = req.user._id || req.user.id;
        const isOwner = report.owner.toString() === userId.toString();
        const isAdmin = req.user.role === 'Admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: 'You are not authorized to delete this report.'
            });
        }

        await report.deleteOne();
        console.log('✓ Report deleted:', req.params.id);

        res.json({ message: 'Report deleted successfully.' });

    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({
            message: 'Failed to delete report.',
            error: error.message
        });
    }
});

// GET /api/reports/by-initiative/:initiativeId - Get the latest report for an initiative
router.get('/by-initiative/:initiativeId', auth, async (req, res) => {
    try {
        const report = await Report.findOne({ initiative: req.params.initiativeId })
            .sort({ createdAt: -1 }) // ambil report terkini
            .populate('initiative', 'name status kpi')
            .populate('owner', 'firstName lastName');

        if (!report) {
            return res.status(404).json({ message: 'No report found for this initiative.' });
        }

        res.json(report);
    } catch (error) {
        console.error('Error fetching latest report:', error);
        res.status(500).json({ message: 'Server error fetching report.' });
    }
});


module.exports = router;