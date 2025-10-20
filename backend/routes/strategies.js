const express = require('express');
const router = express.Router();
const Strategy = require('../models/strategy.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// GET /api/strategies - Get all strategies, or filter by teras
// Example: /api/strategies?terasId=some_teras_id
router.get('/', auth, async (req, res) => {
    try {
        const query = {};
        if (req.query.terasId) {
            query.teras = req.query.terasId;
        }
        const strategies = await Strategy.find(query).sort('name');
        res.json(strategies);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching strategies.' });
    }
});

// POST /api/strategies - Create a new strategy (Admin Only)
router.post('/', [auth, adminAuth], async (req, res) => {
    try {
        const { name, teras } = req.body;
        if (!name || !teras) {
            return res.status(400).json({ message: 'Name and Teras are required.' });
        }
        const newStrategy = new Strategy({ name, teras });
        await newStrategy.save();
        res.status(201).json(newStrategy);
    } catch (error) {
        res.status(500).json({ message: 'Server error creating strategy.' });
    }
});

// PUT /api/strategies/:id - Update a strategy (Admin Only)
router.put('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const updatedStrategy = await Strategy.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedStrategy) {
            return res.status(404).json({ message: 'Strategy not found.' });
        }
        res.json(updatedStrategy);
    } catch (error) {
        res.status(500).json({ message: 'Server error updating strategy.' });
    }
});

// DELETE /api/strategies/:id - Delete a strategy (Admin Only)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const strategy = await Strategy.findByIdAndDelete(req.params.id);
        if (!strategy) {
            return res.status(404).json({ message: 'Strategy not found.' });
        }
        // To-do in a real app: also delete child Initiatives
        res.json({ message: 'Strategy deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error deleting strategy.' });
    }
});

module.exports = router;