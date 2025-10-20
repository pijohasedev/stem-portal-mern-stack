const express = require('express');
const router = express.Router();
const Teras = require('../models/teras.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// GET /api/teras - Get all teras, or filter by policy
// Example: /api/teras?policyId=some_policy_id
router.get('/', auth, async (req, res) => {
    try {
        const query = {};
        if (req.query.policyId) {
            query.policy = req.query.policyId;
        }
        const terasItems = await Teras.find(query).sort('name');
        res.json(terasItems);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching teras.' });
    }
});

// POST /api/teras - Create a new teras (Admin Only)
router.post('/', [auth, adminAuth], async (req, res) => {
    try {
        const { name, policy } = req.body;
        if (!name || !policy) {
            return res.status(400).json({ message: 'Name and policy are required.' });
        }
        const newTeras = new Teras({ name, policy });
        await newTeras.save();
        res.status(201).json(newTeras);
    } catch (error) {
        res.status(500).json({ message: 'Server error creating teras.' });
    }
});

// PUT /api/teras/:id - Update a teras (Admin Only)
router.put('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const updatedTeras = await Teras.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedTeras) {
            return res.status(404).json({ message: 'Teras not found.' });
        }
        res.json(updatedTeras);
    } catch (error) {
        res.status(500).json({ message: 'Server error updating teras.' });
    }
});

// DELETE /api/teras/:id - Delete a teras (Admin Only)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const teras = await Teras.findByIdAndDelete(req.params.id);
        if (!teras) {
            return res.status(404).json({ message: 'Teras not found.' });
        }
        // To-do in a real app: also delete child Strategies
        res.json({ message: 'Teras deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error deleting teras.' });
    }
});

module.exports = router;