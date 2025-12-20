const express = require('express');
const router = express.Router();
const ProgramReport = require('../models/programReport.model');
const auth = require('../middleware/auth');
const User = require('../models/user.model');
const excel = require('exceljs'); // ✅ Tambah ini
const logActivity = require('../utils/logger'); // ✅ Tambah ini

// 1. TAMBAH LAPORAN (POST)
router.post('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'Pengguna tidak dijumpai' });

        const {
            title, venue, dateStart, dateEnd, participantCount,
            description, organizerName, programLevel, targetGroups,
            teras, strategy, location
        } = req.body;

        const newProgram = new ProgramReport({
            title, venue, dateStart, dateEnd, participantCount,
            description, organizerName, programLevel,
            organizerLevel: programLevel || 'Sekolah',
            targetGroups, teras, strategy, location,
            createdBy: req.user.id,
            createdByState: user.state,
            createdByPPD: user.ppd
        });

        const savedProgram = await newProgram.save();

        // Log Aktiviti
        await logActivity(req.user.id, 'SUBMIT_INITIATIVEREPORT', `Laporan Program ditambah: ${title}`, req);

        res.json(savedProgram);

    } catch (err) {
        console.error("Ralat Backend:", err.message);
        res.status(500).send(err.message);
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

        // --- 🔒 LOGIK KAWALAN AKSES ---
        if (user.role === 'Admin') {
            // Admin nampak semua
        } else if (user.role === 'Negeri' || user.role === 'JPN') {
            query.createdByState = user.state;
        } else if (user.role === 'PPD') {
            query.createdByPPD = user.ppd;
        } else {
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

// ✅ 3. BARU: EXPORT DATA (GET /export)
router.get('/export', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};

        // A. Filter Tarikh
        if (startDate && endDate) {
            query.dateStart = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // B. Filter Role (Sama macam GET biasa)
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: "User not found" });

        if (user.role === 'Admin') {
            // Admin: Semua
        } else if (user.role === 'Negeri' || user.role === 'JPN') {
            query.createdByState = user.state;
        } else if (user.role === 'PPD') {
            query.createdByPPD = user.ppd;
        } else {
            query.createdBy = user._id;
        }

        // C. Tarik Data
        const programs = await ProgramReport.find(query)
            .populate('teras', 'name')
            .populate('strategy', 'name')
            .populate('createdByState', 'name')
            .populate('createdByPPD', 'name')
            .sort({ dateStart: -1 });

        // D. Setup Excel
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Program');

        worksheet.columns = [
            { header: 'Tajuk Program', key: 'title', width: 40 },
            { header: 'Peringkat', key: 'level', width: 15 },
            { header: 'Penganjur', key: 'organizer', width: 25 },
            { header: 'Lokasi', key: 'venue', width: 30 },
            { header: 'Tarikh Mula', key: 'start', width: 15 },
            { header: 'Peserta', key: 'pax', width: 10 },
            { header: 'Teras', key: 'teras', width: 20 },
            { header: 'Strategi', key: 'strategy', width: 20 },
            { header: 'Negeri', key: 'state', width: 15 },
            { header: 'PPD', key: 'ppd', width: 20 },
        ];
        worksheet.getRow(1).font = { bold: true };

        programs.forEach(prog => {
            worksheet.addRow({
                title: prog.title,
                level: prog.programLevel,
                organizer: prog.organizerName,
                venue: prog.venue,
                start: prog.dateStart ? new Date(prog.dateStart).toLocaleDateString() : '-',
                pax: prog.participantCount,
                teras: prog.teras?.name || '-',
                strategy: prog.strategy?.name || '-',
                state: prog.createdByState?.name || '-',
                ppd: prog.createdByPPD?.name || '-'
            });
        });

        // E. Log & Hantar
        await logActivity(req.user.id, 'EXPORT_DATA', 'Eksport Laporan Program', req);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Program_Export_${Date.now()}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error("Export Error:", err);
        res.status(500).send("Gagal eksport data.");
    }
});

// 4. PADAM LAPORAN
router.delete('/:id', auth, async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.user.role !== 'Admin') {
            query.createdBy = req.user.id;
        }
        const result = await ProgramReport.findOneAndDelete(query);
        if (!result) return res.status(404).json({ message: "Tiada akses atau rekod tiada." });

        await logActivity(req.user.id, 'DELETE_REPORT', `Padam Program ID: ${req.params.id}`, req);
        res.json({ success: true, message: "Berjaya dipadam." });
    } catch (err) {
        res.status(500).json({ message: "Gagal memadam." });
    }
});

// 5. UPDATE
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

        await logActivity(req.user.id, 'UPDATE_REPORT', `Kemaskini Program: ${updatedProgram.title}`, req);
        res.json(updatedProgram);
    } catch (error) {
        res.status(500).json({ message: "Gagal update." });
    }
});

module.exports = router;