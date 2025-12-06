const express = require('express');
const router = express.Router();
const Teras = require('../models/teras.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// GET /api/teras - Get all teras, or filter by policy
// Example: /api/teras?policy=some_id  OR  /api/teras?policyId=some_id
router.get('/', auth, async (req, res) => {
    try {
        const query = {};

        // ✅ 1. Logik Baru (Untuk Modul Laporan Aktiviti)
        // Frontend baru hantar: /api/teras?policy=...
        if (req.query.policy) {
            query.policy = req.query.policy;
        }

        // ✅ 2. Logik Asal (Kekalkan supaya modul lama tak rosak)
        // Kod asal anda hantar: /api/teras?policyId=...
        if (req.query.policyId) {
            query.policy = req.query.policyId;
        }

        // Nota: Jika anda ada field 'code' (T1, T2), lebih baik sort('code'). 
        // Jika tiada, kekalkan sort('name').
        const terasItems = await Teras.find(query).sort('name');

        res.json(terasItems);
    } catch (error) {
        console.error("Error fetching teras:", error);
        res.status(500).json({ message: 'Server error fetching teras.' });
    }
});

// POST /api/teras - Create a new teras (Admin Only)
router.post('/', [auth, adminAuth], async (req, res) => {
    try {
        const { name, policy, code } = req.body; // Tambah 'code' jika ada dalam model

        if (!name || !policy) {
            return res.status(400).json({ message: 'Name and policy are required.' });
        }

        const newTeras = new Teras({
            name,
            policy,
            code: code || "" // Optional: Simpan kod jika ada
        });

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
        // To-do: Mungkin perlu padam strategi berkaitan secara manual atau guna pre-hook
        res.json({ message: 'Teras deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error deleting teras.' });
    }
});

module.exports = router;