const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const ActivityLog = require('../models/ActivityLog');

// GET /api/audit-logs (atau /api/logs)
router.get('/', [auth, adminAuth], async (req, res) => {
    try {
        // 1. Ambil limit dari URL (Dashboard hantar ?limit=6)
        // Kalau tak ada limit, default 100
        const limit = parseInt(req.query.limit) || 100;

        const logs = await ActivityLog.find()
            // 2. Populate data User
            // Pastikan field 'user' ini wujud dalam Schema ActivityLog anda
            .populate('user', 'firstName lastName email role')
            .sort({ createdAt: -1 }) // Paling baru di atas
            .limit(limit);

        // 3. Format semula data supaya Frontend Dashboard mudah baca
        // Frontend jangka: { action, details, timestamp, performedBy }
        const formattedLogs = logs.map(log => ({
            action: log.action,      // Pastikan column DB anda 'action'
            details: log.details || log.description, // Handle kalau nama field beza
            timestamp: log.createdAt,
            performedBy: log.user    // Dashboard panggil 'performedBy', DB panggil 'user'
        }));

        // 4. Return dalam object { logs: [...] }
        res.json({ logs: formattedLogs });

    } catch (error) {
        console.error("Log Error:", error);
        res.status(500).json({ message: "Gagal memuatkan log audit." });
    }
});

module.exports = router;