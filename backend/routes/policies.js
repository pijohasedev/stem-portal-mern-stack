const express = require('express');
const router = express.Router();
const Policy = require('../models/policy.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// GET /api/policies - Get all policies
router.get('/', auth, async (req, res) => {
    try {
        const policies = await Policy.find().sort('name');
        // This line is crucial - it sends back the data as JSON
        res.json(policies);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching policies.' });
    }
});

// POST /api/policies - Create a new policy (Admin Only)
router.post('/', [auth, adminAuth], async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Policy name is required.' });
        }
        const newPolicy = new Policy({ name, description });
        await newPolicy.save();
        res.status(201).json(newPolicy);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A policy with this name already exists.' });
        }
        res.status(500).json({ message: 'Server error creating policy.' });
    }
});

// PUT /api/policies/:id - Update a policy (Admin Only)
router.put('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const updatedPolicy = await Policy.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedPolicy) {
            return res.status(404).json({ message: 'Policy not found.' });
        }
        res.json(updatedPolicy);
    } catch (error) {
        res.status(500).json({ message: 'Server error updating policy.' });
    }
});

// DELETE /api/policies/:id - Delete a policy (Admin Only)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const policy = await Policy.findByIdAndDelete(req.params.id);
        if (!policy) {
            return res.status(404).json({ message: 'Policy not found.' });
        }
        res.json({ message: 'Policy deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error deleting policy.' });
    }
});

module.exports = router;