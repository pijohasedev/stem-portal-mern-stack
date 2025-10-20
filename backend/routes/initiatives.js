const express = require('express');
const router = express.Router();
const Initiative = require('../models/initiative.model');
const Report = require('../models/report.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// GET /api/initiatives - Gets a list of initiatives with automatic status updates
// GET all initiatives (with role-based filtering)
router.get('/', auth, async (req, res) => {
    try {
        let query = {};
        // --- THIS IS THE FIX ---
        // If the logged-in user is an owner, modify the query to
        // find initiatives where their ID is in the 'assignees' array.
        if (req.user.role === 'owner') {
            query.assignees = req.user.id;
        }

        // The automatic status update logic
        const initiativesFromDB = await Initiative.find(query);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const initiative of initiativesFromDB) {
            let statusChanged = false;
            if (initiative.status === 'At Risk' && initiative.endDate && initiative.endDate >= today) {
                initiative.status = (initiative.startDate && initiative.startDate > today) ? 'Planning' : 'Active';
                statusChanged = true;
            }
            if (initiative.status === 'Planning' && initiative.startDate && initiative.startDate <= today) {
                initiative.status = 'Active';
                statusChanged = true;
            }
            if ((initiative.status === 'Active' || initiative.status === 'Planning') && initiative.endDate && initiative.endDate < today) {
                const progress = initiative.kpi.target > 0 ? ((initiative.kpi.currentValue || 0) / initiative.kpi.target) * 100 : 0;
                if (progress < 100) {
                    initiative.status = 'At Risk';
                    statusChanged = true;
                }
            }
            if (statusChanged) {
                await initiative.save();
            }
        }

        // Fetch the final, populated data using the same query
        const populatedInitiatives = await Initiative.find(query)
            .populate('assignees', 'firstName lastName')
            .lean();

        res.json(populatedInitiatives);

    } catch (err) {
        console.error("Error in GET /api/initiatives:", err);
        res.status(500).json({ message: 'Error fetching initiatives' });
    }
});

// --- POST /api/initiatives ---
// Creates a new initiative (Admin Only)
router.post('/', [auth, adminAuth], async (req, res) => {
    try {
        const { name, strategy, kpi, assignees } = req.body;

        if (!name || !strategy || !kpi || !assignees) {
            return res.status(400).json({ message: 'All initiative fields are required.' });
        }

        const newInitiative = new Initiative({
            name,
            strategy,
            kpi,
            assignees
            // Status defaults to 'Pending Acceptance' automatically
        });

        await newInitiative.save();
        res.status(201).json({ message: 'Initiative created successfully!', data: newInitiative });

    } catch (err) {
        if (err.name === 'ValidationError') {
            const message = Object.values(err.errors).map(val => val.message).join(', ');
            return res.status(400).json({ message });
        }
        res.status(500).json({ message: 'Server error creating initiative.' });
    }
});

// --- GET /api/initiatives/:id ---
// Gets a single initiative by its ID (for View Details)
router.get('/:id', auth, async (req, res) => {
    try {
        const initiative = await Initiative.findById(req.params.id)
            .populate('assignees', 'firstName lastName')
            .populate('strategy', 'name')
            .lean();

        if (!initiative) {
            return res.status(404).json({ message: 'Initiative not found' });
        }

        // ✅ Hanya semak pemilikan kalau field owner wujud
        if (
            req.user.role !== 'admin' &&
            initiative.owner &&
            initiative.owner._id &&
            initiative.owner._id.toString() !== req.user.id
        ) {
            return res.status(403).json({ message: 'User not authorized.' });
        }

        res.json(initiative);
    } catch (error) {
        console.error('Error fetching initiative by ID:', error);
        res.status(500).json({ message: 'Server error fetching initiative.' });
    }
});


// --- PUT /api/initiatives/:id ---
// Updates an initiative by its ID (Admin Only)
router.put('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const updatedInitiative = await Initiative.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedInitiative) {
            return res.status(404).json({ message: "Initiative not found" });
        }
        res.json({ message: 'Initiative updated successfully!', initiative: updatedInitiative });
    } catch (error) {
        res.status(500).json({ message: 'Server error updating initiative.' });
    }
});

// --- PATCH /api/initiatives/:id/accept ---
// Allows an owner to accept an initiative
router.patch('/:id/accept', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const initiative = await Initiative.findById(req.params.id);

        if (!initiative) {
            return res.status(404).json({ message: 'Initiative not found.' });
        }

        // --- THIS IS THE FIX ---
        // We now check if the user's ID is included in the 'assignees' array.
        const isAssigned = initiative.assignees.some(assigneeId => assigneeId.toString() === req.user.id);
        if (!isAssigned) {
            return res.status(403).json({ message: 'User not authorized to update this initiative.' });
        }
        // ------------------------

        initiative.status = 'Planning';
        initiative.startDate = startDate;
        initiative.endDate = endDate;

        await initiative.save();
        res.json({ message: 'Initiative accepted and is now in planning.', data: initiative });
    } catch (error) {
        console.error('Error accepting initiative:', error);
        res.status(500).json({ message: 'Server error while accepting initiative.' });
    }
});

// PATCH /api/initiatives/:id/dates - Update an initiative's dates (Admin Only)
router.patch('/:id/dates', [auth, adminAuth], async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Both start date and end date are required.' });
        }

        const updatedInitiative = await Initiative.findByIdAndUpdate(
            req.params.id,
            { startDate, endDate },
            { new: true } // This option returns the updated document
        );

        if (!updatedInitiative) {
            return res.status(404).json({ message: 'Initiative not found.' });
        }

        res.json({ message: 'Initiative dates updated successfully.', data: updatedInitiative });
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating dates.' });
    }
});

// DELETE /api/initiatives/:id - Delete an initiative (Admin Only)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const initiative = await Initiative.findByIdAndDelete(req.params.id);

        if (!initiative) {
            return res.status(404).json({ message: 'Initiative not found.' });
        }

        // Good Practice: In a real app, you might also want to delete all reports 
        // associated with this initiative. For now, we'll just delete the initiative itself.

        res.json({ message: 'Initiative permanently deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting initiative.' });
    }
});

module.exports = router;