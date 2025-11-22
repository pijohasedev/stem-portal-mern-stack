// backend/routes/ppds.js
const express = require('express');
const router = express.Router();
const PPD = require('../models/ppd.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// POST /api/ppds - Cipta PPD baru (Admin sahaja)
router.post('/', [auth, adminAuth], async (req, res) => {
    try {
        const { name, state } = req.body; // 'state' ialah state ID
        if (!name || !state) {
            return res.status(400).json({ message: 'Nama PPD dan Negeri diperlukan.' });
        }

        const newPPD = new PPD({
            name,
            state
        });

        await newPPD.save();
        await newPPD.populate('state', 'name code'); // Hantar balik data PPD bersama nama Negeri

        res.status(201).json(newPPD);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'PPD ini telah wujud dalam negeri tersebut.' });
        }
        res.status(500).json({ message: 'Ralat server', error: error.message });
    }
});

// GET /api/ppds - Dapatkan semua PPD (Untuk semua pengguna log masuk)
router.get('/', auth, async (req, res) => {
    try {
        const ppds = await PPD.find()
            .populate('state', 'name code') // Pautkan maklumat negeri
            .sort({ name: 1 });
        res.json(ppds);
    } catch (error) {
        res.status(500).json({ message: 'Ralat server', error: error.message });
    }
});

// GET /api/ppds/by-state/:stateId - Dapatkan PPD mengikut Negeri (PENTING untuk borang)
router.get('/by-state/:stateId', auth, async (req, res) => {
    try {
        const ppds = await PPD.find({ state: req.params.stateId }).sort({ name: 1 });
        res.json(ppds);
    } catch (error) {
        res.status(500).json({ message: 'Ralat server', error: error.message });
    }
});

// DELETE /api/ppds/:id - Padam PPD (Admin sahaja)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
    // Nota: Tambah logik untuk semak jika User masih guna ID ini sebelum padam
    try {
        const ppd = await PPD.findByIdAndDelete(req.params.id);
        if (!ppd) {
            return res.status(404).json({ message: 'PPD tidak ditemui.' });
        }
        res.json({ message: 'PPD berjaya dipadam.' });
    } catch (error) {
        res.status(500).json({ message: 'Ralat server', error: error.message });
    }
});

module.exports = router;