// routes/automation.js
const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth'); // Import middleware tadi
const SchoolEnrollment = require('../models/SchoolEnrollment');
// Import model lain jika perlu...

// ✅ Middleware 'apiKeyAuth' dipasang di sini
// Bermakna semua route di bawah WAJIB ada API Key
router.use(apiKeyAuth);

// CONTOH 1: CRON JOB - Auto Archive Data Lama (n8n panggil sebulan sekali)
// Endpoint: POST /api/automation/archive-old-data
router.post('/archive-old-data', async (req, res) => {
    try {
        console.log("n8n Triggered: Mengarsipkan data lama...");

        // Contoh logik: Cari data tahun 2023 ke bawah dan tukar status
        const result = await SchoolEnrollment.updateMany(
            { year: { $lt: 2024 }, status: { $ne: 'Archived' } },
            { $set: { status: 'Archived' } }
        );

        res.json({
            message: 'Proses pengarsipan selesai.',
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CONTOH 2: REPORTING - Dapatkan Statistik Terkini (n8n panggil setiap Isnin pagi)
// Endpoint: GET /api/automation/weekly-stats
router.get('/weekly-stats', async (req, res) => {
    try {
        const totalSchools = await SchoolEnrollment.countDocuments();
        const pending = await SchoolEnrollment.countDocuments({ status: 'Pending Verification' });

        // n8n akan ambil JSON ini dan hantar ke Telegram/Email bos
        res.json({
            date: new Date(),
            totalSchools,
            pendingVerification: pending,
            systemStatus: "Healthy"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;