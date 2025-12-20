const express = require('express');
const router = express.Router();
const PPD = require('../models/ppd.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// POST /api/ppds - Cipta PPD baru (Admin sahaja)
router.post('/', [auth, adminAuth], async (req, res) => {
    try {
        const { name, state } = req.body;
        if (!name || !state) {
            return res.status(400).json({ message: 'Nama PPD dan Negeri diperlukan.' });
        }

        const newPPD = new PPD({ name, state });
        await newPPD.save();
        await newPPD.populate('state', 'name code');

        res.status(201).json(newPPD);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'PPD ini telah wujud dalam negeri tersebut.' });
        }
        res.status(500).json({ message: 'Ralat server', error: error.message });
    }
});

// ✅ KEMASKINI PENTING DI SINI:
// GET /api/ppds - Dapatkan PPD (Boleh filter ?state=ID)
router.get('/', auth, async (req, res) => {
    try {
        const { state } = req.query; // Ambil parameter ?state=... dari URL frontend
        let query = {};

        // Jika ada state ID dihantar, tapis database
        if (state && state !== 'undefined' && state !== 'ALL') {
            query.state = state;
        }

        // Cari PPD berdasarkan filter 'query' di atas
        const ppds = await PPD.find(query)
            .populate('state', 'name code')
            .sort({ name: 1 });

        res.json(ppds);
    } catch (error) {
        res.status(500).json({ message: 'Ralat server', error: error.message });
    }
});

// GET /api/ppds/by-state/:stateId - (Route ini masih berguna sebagai backup)
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