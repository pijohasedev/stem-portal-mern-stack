const express = require('express');
const router = express.Router();
const Department = require('../models/department.model');

// LALUAN SEDIA ADA: GET /api/departments (untuk dapatkan semua)
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.status(200).json(departments);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mendapatkan senarai department.' });
    }
});

// --- TAMBAHAN BARU: POST /api/departments (untuk cipta department baru) ---
router.post('/', async (req, res) => {
    // Ambil 'name' dari body permintaan
    const { name } = req.body;

    // Pastikan 'name' dihantar
    if (!name) {
        return res.status(400).json({ message: 'Nama department diperlukan.' });
    }

    try {
        // Cipta department baru
        const newDepartment = new Department({ name });
        // Simpan ke database
        await newDepartment.save();
        // Hantar balik data yang baru dicipta dengan status 201 (Created)
        res.status(201).json(newDepartment);
    } catch (error) {
        // Tangani ralat (contohnya, jika nama sudah wujud)
        res.status(500).json({ message: 'Gagal mencipta department baru.', error: error.message });
    }
});
// --------------------------------------------------------------------------

module.exports = router;