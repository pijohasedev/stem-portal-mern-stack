const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Policy = require('../models/policy.model');
const Teras = require('../models/teras.model');
const Strategy = require('../models/strategy.model');
const Initiative = require('../models/initiative.model');

// Helper function untuk update status berdasarkan tarikh
const updateInitiativeStatus = (initiative, isManualDateUpdate = false) => {
    // ✅ PENTING: Jangan update status jika masih Pending Acceptance
    // Status ini hanya boleh berubah bila owner accept/reject
    if (initiative.status === 'Pending Acceptance') {
        console.log(`\nChecking: ${initiative.name}`);
        console.log(`  Current status: ${initiative.status}`);
        console.log(`  - Skipping auto-update (waiting for owner acceptance)`);
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Pastikan tarikh dalam format yang betul
    const startDate = initiative.startDate ? new Date(initiative.startDate) : null;
    const endDate = initiative.endDate ? new Date(initiative.endDate) : null;

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(0, 0, 0, 0);

    // Validate KPI data
    if (!initiative.kpi || initiative.kpi.target === undefined) {
        console.warn(`Initiative "${initiative.name}" missing KPI data`);
        return false;
    }

    // Kira progress
    const progress = initiative.kpi.target > 0
        ? (initiative.kpi.currentValue / initiative.kpi.target) * 100
        : 0;

    let statusChanged = false;
    const oldStatus = initiative.status;

    console.log(`\nChecking: ${initiative.name}`);
    console.log(`  Current status: ${initiative.status}`);
    console.log(`  Start date: ${startDate ? startDate.toISOString().split('T')[0] : 'N/A'}`);
    console.log(`  End date: ${endDate ? endDate.toISOString().split('T')[0] : 'N/A'}`);
    console.log(`  Today: ${today.toISOString().split('T')[0]}`);
    console.log(`  Progress: ${progress.toFixed(2)}%`);
    console.log(`  Is manual date update: ${isManualDateUpdate}`);

    // Determine status based on dates and progress
    let newStatus = initiative.status;

    // Priority 1: Check if completed (100% progress)
    if (progress >= 100) {
        newStatus = 'Completed';
        console.log(`  → Should be Completed (100% progress)`);
    }
    // Priority 2: Check date range
    else if (!startDate || startDate > today) {
        // Belum sampai start date = Planning
        newStatus = 'Planning';
        console.log(`  → Should be Planning (today < start date)`);
    }
    else if (startDate <= today && (!endDate || endDate >= today)) {
        // Dalam range start date hingga end date = Active
        newStatus = 'Active';
        console.log(`  → Should be Active (start date <= today <= end date)`);
    }
    else if (endDate && endDate < today) {
        // Sudah lepas end date dan belum 100% = At Risk
        newStatus = 'At Risk';
        console.log(`  → Should be At Risk (today > end date & progress < 100%)`);
    }

    // Check if status needs to change
    if (newStatus !== initiative.status) {
        const oldStatus = initiative.status;
        initiative.status = newStatus;
        statusChanged = true;
        console.log(`  ✓ Status updated: ${oldStatus} → ${newStatus}`);
    }

    if (statusChanged) {
        console.log(`  ✓ Status change confirmed`);
    } else {
        console.log(`  - No status change needed (already correct: ${initiative.status})`);
    }

    return statusChanged;
};

// PATCH endpoint untuk update tarikh DAN status
router.patch('/initiatives/:id/dates', [auth, adminAuth], async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const initiativeId = req.params.id;

        console.log(`\n=== Updating dates for initiative ${initiativeId} ===`);
        console.log(`New start date: ${startDate}`);
        console.log(`New end date: ${endDate}`);

        // Cari initiative
        const initiative = await Initiative.findById(initiativeId);

        if (!initiative) {
            return res.status(404).json({ message: 'Initiative not found' });
        }

        // Update tarikh
        if (startDate) initiative.startDate = new Date(startDate);
        if (endDate) initiative.endDate = new Date(endDate);

        // Update status berdasarkan tarikh baru - pass true untuk indicate manual update
        const statusChanged = updateInitiativeStatus(initiative, true);

        // Save changes
        await initiative.save();

        console.log(`=== Update completed ===\n`);

        res.json({
            message: 'Dates updated successfully',
            initiative: {
                _id: initiative._id,
                name: initiative.name,
                startDate: initiative.startDate,
                endDate: initiative.endDate,
                status: initiative.status
            },
            statusChanged: statusChanged
        });

    } catch (error) {
        console.error('Error updating initiative dates:', error);
        res.status(500).json({
            message: 'Failed to update dates',
            error: error.message
        });
    }
});

// GET endpoint untuk fetch initiatives tree
router.get('/initiatives', [auth, adminAuth], async (req, res) => {
    try {
        console.log(`\n=== Starting bulk status update check ===`);

        // Step 1: Fetch all initiatives and update statuses
        const initiativesFromDB = await Initiative.find();
        let updatedCount = 0;

        for (const initiative of initiativesFromDB) {
            const statusChanged = updateInitiativeStatus(initiative);
            if (statusChanged) {
                await initiative.save();
                updatedCount++;
            }
        }

        console.log(`\nBulk update completed. ${updatedCount} initiative(s) updated.\n`);

        // Step 2: Fetch all data to build the tree
        const [policies, terasItems, strategies, initiatives] = await Promise.all([
            Policy.find().sort({ name: 1 }).lean(),
            Teras.find().sort({ name: 1 }).lean(),
            Strategy.find().sort({ name: 1 }).lean(),
            Initiative.find().populate('assignees', 'firstName lastName').sort({ name: 1 }).lean()
        ]);

        // Group teras by policy
        const terasByPolicy = new Map();
        terasItems.forEach(t => {
            const policyId = t.policy.toString();
            if (!terasByPolicy.has(policyId)) terasByPolicy.set(policyId, []);
            terasByPolicy.get(policyId).push(t);
        });

        // Group strategies by teras
        const strategiesByTeras = new Map();
        strategies.forEach(s => {
            const terasId = s.teras.toString();
            if (!strategiesByTeras.has(terasId)) strategiesByTeras.set(terasId, []);
            strategiesByTeras.get(terasId).push(s);
        });

        // Group initiatives by strategy
        const initiativesByStrategy = new Map();
        initiatives.forEach(i => {
            if (i.strategy) {
                const strategyId = i.strategy.toString();
                if (!initiativesByStrategy.has(strategyId)) initiativesByStrategy.set(strategyId, []);
                initiativesByStrategy.get(strategyId).push(i);
            }
        });

        // Build the complete tree structure
        const tree = policies.map(policy => {
            const terasChildren = terasByPolicy.get(policy._id.toString()) || [];
            policy.teras = terasChildren.map(teras => {
                const strategyChildren = strategiesByTeras.get(teras._id.toString()) || [];
                teras.strategies = strategyChildren.map(strategy => {
                    strategy.initiatives = initiativesByStrategy.get(strategy._id.toString()) || [];
                    return strategy;
                });
                return teras;
            });
            return policy;
        });

        res.json({
            tree: tree,
            totals: {
                policies: policies.length,
                teras: terasItems.length,
                strategies: strategies.length,
                initiatives: initiatives.length
            },
            statusUpdates: {
                checked: initiativesFromDB.length,
                updated: updatedCount
            }
        });

    } catch (error) {
        console.error("Error building initiative tree:", error);
        res.status(500).json({
            message: "Server error building initiative tree.",
            error: error.message
        });
    }
});

module.exports = router;