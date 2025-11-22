// backend/routes/states.js
const express = require('express');
const router = express.Router();
const State = require('../models/state.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// POST /api/states - Cipta Negeri baru (Admin sahaja)
router.post('/', [auth, adminAuth], async (req, res) => {
    try {
        const { name, code } = req.body;
        if (!name || !code) {
            return res.status(400).json({ message: 'Nama dan Kod Negeri diperlukan.' });
        }

        const newState = new State({
            name,
            code: code.toUpperCase()
        });

        await newState.save();
        res.status(201).json(newState);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Negeri atau Kod ini telah wujud.' });
        }
        res.status(500).json({ message: 'Ralat server', error: error.message });
    }
});

// GET /api/states - Dapatkan semua Negeri (Untuk semua pengguna log masuk)
router.get('/', auth, async (req, res) => {
    try {
        const states = await State.find().sort({ name: 1 });
        res.json(states);
    } catch (error) {
        res.status(500).json({ message: 'Ralat server', error: error.message });
    }
});

// DELETE /api/states/:id - Padam Negeri (Admin sahaja)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
    // Nota: Tambah logik untuk semak jika PPD masih guna ID ini sebelum padam
    try {
        const state = await State.findByIdAndDelete(req.params.id);
        if (!state) {
            return res.status(404).json({ message: 'Negeri tidak ditemui.' });
        }
        res.json({ message: 'Negeri berjaya dipadam.' });
    } catch (error) {
        res.status(500).json({ message: 'Ralat server', error: error.message });
    }
});

module.exports = router;