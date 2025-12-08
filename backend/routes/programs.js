const express = require('express');
const router = express.Router();
const ProgramReport = require('../models/programReport.model');
const auth = require('../middleware/auth');

// 1. TAMBAH LAPORAN BARU
router.post('/', auth, async (req, res) => {
    try {
        const user = req.user;

        // Logic penentuan nama penganjur default (Backup jika frontend tak hantar)
        let defaultOrgName = user.firstName + " " + user.lastName;
        let defaultLevel = 'Sekolah';

        if (user.role === 'PPD') {
            defaultLevel = 'PPD';
            defaultOrgName = "PPD " + (user.ppdName || "Daerah");
        } else if (user.role === 'Negeri' || user.role === 'negeri') {
            defaultLevel = 'Negeri/JPN';
            defaultOrgName = "JPN " + (user.stateName || "Negeri");
        } else if (user.role === 'Bahagian') {
            defaultLevel = 'Kebangsaan';
        }

        // Kita guna data dari frontend (req.body), jika tiada baru guna default
        const newProgram = new ProgramReport({
            ...req.body,
            organizerLevel: req.body.organizerLevel || defaultLevel,
            organizerName: req.body.organizerName || defaultOrgName,
            createdBy: user.id
        });

        await newProgram.save();
        res.status(201).json(newProgram);

    } catch (error) {
        console.error("Error creating program:", error);
        res.status(500).json({ message: "Gagal menyimpan laporan.", error: error.message });
    }
});

// 2. SENARAIKAN SEMUA PROGRAM
router.get('/', auth, async (req, res) => {
    try {
        const { level, year } = req.query;
        let query = {};

        if (level && level !== 'ALL') {
            query.programLevel = level;
        }

        if (year) {
            const startDate = new Date(`${year}-01-01`);
            const endDate = new Date(`${year}-12-31`);
            query.dateStart = { $gte: startDate, $lte: endDate };
        }

        const programs = await ProgramReport.find(query)
            .sort({ dateStart: -1 })
            .populate('teras', 'name code')       // ✅ Populate Teras
            .populate('strategy', 'name code')    // ✅ Populate Strategy
            .limit(100);

        res.json(programs);
    } catch (error) {
        console.error("Error fetching programs:", error);
        res.status(500).json({ message: "Gagal mendapatkan senarai." });
    }
});

// 3. PADAM LAPORAN (Untuk creator sahaja)
router.delete('/:id', auth, async (req, res) => {
    try {
        // Hanya benarkan padam jika user adalah pencipta atau Admin
        const query = { _id: req.params.id };
        if (req.user.role !== 'Admin') {
            query.createdBy = req.user.id;
        }

        const result = await ProgramReport.findOneAndDelete(query);

        if (!result) {
            return res.status(404).json({ message: "Rekod tidak dijumpai atau anda tiada akses memadamnya." });
        }

        res.json({ success: true, message: "Rekod berjaya dipadam." });
    } catch (err) {
        res.status(500).json({ message: "Gagal memadam." });
    }
});

// 4. EKSPORT DATA MENGIKUT TARIKH
router.get('/export', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Sila nyatakan tarikh mula dan tamat." });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const programs = await ProgramReport.find({
            dateStart: { $gte: start, $lte: end }
        })
            .sort({ dateStart: 1 })
            // ✅ TAMBAH DUA BARIS INI:
            .populate('teras', 'name code')
            .populate('strategy', 'name code');

        res.json(programs);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengeksport data." });
    }
});

// 5. UPDATE LAPORAN (Edit)
router.put('/:id', auth, async (req, res) => {
    try {
        const program = await ProgramReport.findById(req.params.id);

        if (!program) return res.status(404).json({ message: "Rekod tidak dijumpai" });

        // Check ownership (jika bukan admin)
        if (req.user.role !== 'Admin' && program.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Anda tiada kebenaran untuk mengedit rekod ini." });
        }

        const updatedProgram = await ProgramReport.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true } // Return updated document
        );

        res.json(updatedProgram);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengemaskini rekod." });
    }
});

module.exports = router;