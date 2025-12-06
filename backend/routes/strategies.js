const express = require('express');
const router = express.Router();
const Strategy = require('../models/strategy.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// GET /api/strategies - Get all strategies, or filter by teras
// Example: /api/strategies?teras=ID  OR  /api/strategies?terasId=ID
router.get('/', auth, async (req, res) => {
    try {
        const query = {};

        // ✅ 1. Logik Baru (Standard query)
        if (req.query.teras) {
            query.teras = req.query.teras;
        }

        // ✅ 2. Logik Asal (Legacy Support - terasId)
        if (req.query.terasId) {
            query.teras = req.query.terasId;
        }

        // ✅ 3. Populate: Bawa info Teras sekali
        const strategies = await Strategy.find(query)
            .populate('teras') // Penting untuk frontend memaparkan nama Teras
            .sort('name');

        res.json(strategies);
    } catch (error) {
        console.error("Error fetching strategies:", error);
        res.status(500).json({ message: 'Server error fetching strategies.' });
    }
});

// POST /api/strategies - Create a new strategy (Admin Only)
router.post('/', [auth, adminAuth], async (req, res) => {
    try {
        const { name, teras, code } = req.body; // Tambah 'code' jika ada

        if (!name || !teras) {
            return res.status(400).json({ message: 'Name and Teras are required.' });
        }

        const newStrategy = new Strategy({
            name,
            teras,
            code: code || "" // Optional
        });

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