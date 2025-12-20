// backend/routes/program.js
const express = require('express');
const router = express.Router();
const ProgramReport = require('../models/programReport.model');
const auth = require('../middleware/auth');
const User = require('../models/user.model');

// 1. TAMBAH LAPORAN (POST)
router.post('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'Pengguna tidak dijumpai' });
        }

        const {
            title, venue, dateStart, dateEnd, participantCount,
            description, organizerName, programLevel, targetGroups,
            teras, strategy, location
        } = req.body;

        const newProgram = new ProgramReport({
            title,
            venue,
            dateStart,
            dateEnd,
            participantCount,
            description,
            organizerName,

            programLevel, // Ini data dari frontend

            // ✅ TAMBAH BARIS INI (PENYELESAIAN)
            // Kita gunakan nilai programLevel untuk isi organizerLevel
            organizerLevel: programLevel || 'Sekolah',

            targetGroups,
            teras,
            strategy,
            location,
            createdBy: req.user.id,
            createdByState: user.state,
            createdByPPD: user.ppd
        });

        const savedProgram = await newProgram.save();
        res.json(savedProgram);

    } catch (err) {
        console.error("Ralat Backend:", err.message);
        res.status(500).send(err.message); // Hantar error sebenar supaya nampak di Postman/Console
    }
});

// 2. DAPATKAN SENARAI (GET) - Logik Hierarki
router.get('/', auth, async (req, res) => {
    try {
        const { level } = req.query;
        let query = {};

        if (level && level !== 'ALL') {
            query.programLevel = level;
        }

        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ msg: "User not found" });

        // --- 🔒 LOGIK KAWALAN AKSES (HIERARKI) ---
        if (user.role === 'Admin') {
            // Admin nampak semua
        }
        else if (user.role === 'Negeri' || user.role === 'JPN') { // ✅ DIBETULKAN
            // JPN/Negeri nampak semua dalam State ID yang sama
            query.createdByState = user.state;
        }
        else if (user.role === 'PPD') {
            // PPD nampak semua dalam PPD ID yang sama
            query.createdByPPD = user.ppd;
        }
        else {
            // User biasa nampak diri sendiri sahaja
            query.createdBy = user._id;
        }

        const programs = await ProgramReport.find(query)
            .populate('teras', 'code name')
            .populate('strategy', 'code name')
            .populate('createdByState', 'name')
            .populate('createdByPPD', 'name')
            .sort({ dateStart: -1 });

        res.json(programs);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ... (DELETE, EXPORT, PUT kekal sama seperti kod asal anda, tiada perubahan logik diperlukan) ...
// Cuma pastikan di DELETE/PUT, ownership check masih valid.

// 3. PADAM LAPORAN
router.delete('/:id', auth, async (req, res) => {
    try {
        const query = { _id: req.params.id };
        // Admin boleh padam semua, User lain hanya boleh padam hak sendiri
        if (req.user.role !== 'Admin') {
            query.createdBy = req.user.id;
        }
        const result = await ProgramReport.findOneAndDelete(query);
        if (!result) return res.status(404).json({ message: "Tiada akses atau rekod tiada." });
        res.json({ success: true, message: "Berjaya dipadam." });
    } catch (err) {
        res.status(500).json({ message: "Gagal memadam." });
    }
});

// 5. UPDATE (Pastikan fetch user jika perlu update state/ppd, tapi biasanya edit tak ubah owner location)
router.put('/:id', auth, async (req, res) => {
    try {
        const program = await ProgramReport.findById(req.params.id);
        if (!program) return res.status(404).json({ message: "Rekod tiada" });

        if (req.user.role !== 'Admin' && program.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Tiada akses edit." });
        }

        const updatedProgram = await ProgramReport.findByIdAndUpdate(
            req.params.id, req.body, { new: true }
        );
        res.json(updatedProgram);
    } catch (error) {
        res.status(500).json({ message: "Gagal update." });
    }
});

module.exports = router;