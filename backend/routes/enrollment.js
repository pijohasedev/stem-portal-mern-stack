const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const SchoolEnrollment = require('../models/SchoolEnrollment');
const auth = require('../middleware/auth');
const User = require('../models/user.model');
const PPD = require('../models/ppd.model');
const State = require('../models/state.model');
const EnrollmentSettings = require('../models/EnrollmentSettings');

// 1. DAPATKAN SENARAI SEKOLAH (PPD VIEW & ADMIN VIEW)
// Route: GET /api/enrollment/my-district?year=2025&month=10
router.get('/my-district', auth, async (req, res) => {
    try {
        const { year, month } = req.query;

        // Dapatkan user
        const user = await User.findById(req.user.id);

        // Bina Query Asas
        let query = {
            year: year || new Date().getFullYear(),
            month: month || (new Date().getMonth() + 1)
        };

        // LOGIK UTAMA:
        // Jika user adalah PPD, kita tapis ikut ID PPD dia.
        // Jika user adalah Admin, kita JANGAN tapis (bagi semua), KECUALI jika Admin tu sendiri ada PPD assigned.
        if (user.role === 'PPD' || (user.role !== 'Admin' && user.ppd)) {
            if (!user.ppd) {
                return res.status(403).json({ message: "Anda tidak mempunyai PPD yang ditetapkan." });
            }
            query.ppd = user.ppd;
        }
        // Jika Admin, query.ppd tidak diset, bermakna ia akan cari semua.

        // Cari data
        const records = await SchoolEnrollment.find(query)
            .populate('ppd', 'name') // ✅ PENTING: Dapatkan nama PPD untuk paparan Admin
            .sort({ ppd: 1, schoolCode: 1 }); // Susun ikut PPD dulu, kemudian Kod Sekolah

        res.json(records);

    } catch (error) {
        console.error("Error fetching records:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// 1.5 SENARAI SEKOLAH UNTUK DISEMAK (ADMIN & PPD)
// Route: GET /api/enrollment/verify?year=2025&month=10&state=...&ppd=...
router.get('/verify', auth, async (req, res) => {
    try {
        const { year, month, state, ppd } = req.query;

        console.log("--- DEBUG /verify ---");
        console.log("User Role:", req.user.role);
        console.log("Query Params:", req.query);

        let query = {
            year: parseInt(year) || new Date().getFullYear(),
            month: parseInt(month) || (new Date().getMonth() + 1)
        };

        const userRole = (req.user.role || "").toLowerCase();

        if (userRole === 'ppd') {
            // --- JIKA PPD ---
            let userPpdId = req.user.ppd;

            // Fallback jika token tak ada PPD ID
            if (!userPpdId) {
                const userFull = await User.findById(req.user.id);
                userPpdId = userFull.ppd;
            }

            if (!userPpdId) {
                return res.status(403).json({ message: "Akaun anda tiada PPD yang sah." });
            }

            console.log("Filtering for PPD User:", userPpdId);
            query.ppd = userPpdId;

        } else if (['admin', 'negeri', 'bahagian'].includes(userRole)) {
            // --- JIKA ADMIN / JPN ---
            if (ppd && ppd !== 'ALL' && ppd !== 'undefined') {
                query.ppd = ppd;
            }
            if (state && state !== 'ALL' && state !== 'undefined') {
                query.state = new mongoose.Types.ObjectId(state);
            }
        }

        console.log("Final Mongo Query:", query);

        const schools = await SchoolEnrollment.find(query)

            .populate('ppd', 'name')
            .populate('state', 'name')
            .sort({ 'ppd': 1, 'schoolName': 1 }); // Susun ikut PPD, kemudian Nama Sekolah

        console.log(`Jumpa ${schools.length} rekod.`);
        res.json(schools);

    } catch (error) {
        console.error("Error fetching verification list:", error);
        res.status(500).json({ message: "Server error." });
    }
});



// 2. KEMASKINI & SAHKAN DATA (PPD ACTION) - DENGAN KAWALAN TARIKH
router.put('/:id/verify', auth, async (req, res) => {
    try {
        // --- LOGIK KAWALAN MULA ---
        const record = await SchoolEnrollment.findById(req.params.id);
        if (!record) return res.status(404).json({ message: "Rekod tidak dijumpai" });

        // Admin sentiasa boleh override (bypass date check)
        if (req.user.role !== 'Admin') {
            const settings = await EnrollmentSettings.findOne({ year: record.year });
            const now = new Date();

            if (!settings || !settings.verifyStartDate || !settings.verifyEndDate) {
                return res.status(403).json({ message: "Sesi semakan belum dibuka oleh Admin." });
            }

            if (now < new Date(settings.verifyStartDate)) {
                return res.status(403).json({ message: "Sesi semakan belum bermula." });
            }

            // Tambah 1 hari pada EndDate supaya ia tamat pada 23:59:59 hari tersebut
            const endDate = new Date(settings.verifyEndDate);
            endDate.setHours(23, 59, 59, 999);

            if (now > endDate) {
                return res.status(403).json({ message: "Sesi semakan telah ditutup." });
            }
        }
        // --- LOGIK KAWALAN TAMAT ---

        const { verifiedData } = req.body;

        // ... (Kekalkan kod update asal di sini) ...
        record.verifiedData = { ...record.verifiedData, ...verifiedData };
        record.status = 'Verified by PPD';
        record.logs.push({ action: 'Verified by PPD', user: req.user.id, timestamp: new Date() });

        await record.save();
        res.json({ message: "Data berjaya disahkan!", record });

    } catch (error) {
        console.error("Error verifying:", error);
        res.status(500).json({ message: error.message || "Gagal mengemaskini." });
    }
});

// 3. ADMIN/JPN - CREATE INITIAL DATA (IMPORT MOCKUP)
// Route: POST /api/enrollment/init (Untuk testing sahaja buat masa ni)
router.post('/init', auth, async (req, res) => {
    try {
        // Contoh mudah untuk create dummy data
        const newRecord = new SchoolEnrollment(req.body);
        await newRecord.save();
        res.json(newRecord);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. ADMIN - IMPORT PUKAL (SMART MAPPING)
router.post('/import', auth, async (req, res) => {
    const { year, month, data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Tiada data untuk diproses." });
    }

    try {
        console.log("Memulakan import...");

        // 1. DAPATKAN SEMUA PPD & STATE DARI DB SEBAGAI RUJUKAN (LOOKUP)
        // Kita tarik semua ke dalam memory untuk elak query database beribu kali
        const allPPDs = await PPD.find({});
        const allStates = await State.find({});

        // Buat "Dictionary" untuk carian pantas
        // Contoh format: { "PPD PASIR GUDANG": "id_123", "PPD KOTA TINGGI": "id_456" }
        const ppdMap = {};
        allPPDs.forEach(p => {
            ppdMap[p.name.toUpperCase().trim()] = p._id;
        });

        const stateMap = {};
        allStates.forEach(s => {
            stateMap[s.name.toUpperCase().trim()] = s._id;
        });

        // 2. PROSES DATA EXCEL
        const bulkOps = [];
        const errors = [];

        for (const item of data) {
            // Cuba cari ID berdasarkan Nama dalam Excel
            const ppdName = (item.ppdName || "").toUpperCase().trim();
            const stateName = (item.stateName || "").toUpperCase().trim();

            const foundPPDId = ppdMap[ppdName];
            // Cari state ID dari map, ATAU jika tiada, cuba cari state ID melalui PPD object (jika struktur DB menyokong)
            let foundStateId = stateMap[stateName];

            // Fallback: Jika PPD jumpa tapi State tak jumpa, guna State ID dari PPD tersebut
            if (!foundStateId && foundPPDId) {
                const ppdObj = allPPDs.find(p => p._id === foundPPDId);
                if (ppdObj && ppdObj.state) foundStateId = ppdObj.state;
            }

            // Jika PPD tak jumpa dalam database kita, skip row ini & rekod error
            if (!foundPPDId) {
                errors.push(`PPD tidak dijumpai: ${item.ppdName} (Sekolah: ${item.schoolName})`);
                continue;
            }

            // Setup data update
            const updateDoc = {
                schoolName: item.schoolName,
                schoolType: item.schoolType || 'SMK',
                ppd: foundPPDId,   // ✅ ID Autumatik
                state: foundStateId, // ✅ ID Automatik

                systemData: {
                    stemA: Number(item.stemA) || 0,
                    stemB: Number(item.stemB) || 0,
                    stemC1: Number(item.stemC1) || 0,
                    stemC2: Number(item.stemC2) || 0,
                    categoryE: Number(item.categoryE) || 0,
                    categoryF: Number(item.categoryF) || 0,
                    nonStem: Number(item.nonStem) || 0,
                    totalStudents: Number(item.totalStudents) || 0
                },

                status: 'Pending Verification', // Reset status supaya PPD semak semula

                $push: {
                    logs: {
                        action: 'Bulk Import',
                        user: req.user.id,
                        timestamp: new Date()
                    }
                }
            };

            bulkOps.push({
                updateOne: {
                    filter: {
                        schoolCode: item.schoolCode,
                        year: Number(year),
                        month: Number(month)
                    },
                    update: { $set: updateDoc },
                    upsert: true
                }
            });
        }

        // 3. LAKSANAKAN SAVE KE DB
        let result = { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        if (bulkOps.length > 0) {
            result = await SchoolEnrollment.bulkWrite(bulkOps);
        }

        res.json({
            message: "Proses import selesai.",
            success: bulkOps.length,
            failed: errors.length,
            errors: errors.slice(0, 10), // Tunjuk 10 error pertama sahaja
            details: result
        });

    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).json({ message: "Ralat kritikal semasa import: " + error.message });
    }
});

// 5. JPN - RINGKASAN STATUS MENGIKUT PPD
// Route: GET /api/enrollment/summary?year=2024&month=10&state=691...
router.get('/summary', auth, async (req, res) => {
    try {
        const { year, month, state } = req.query; // ✅ Baca 'state' dari query
        const targetYear = parseInt(year) || new Date().getFullYear();
        const targetMonth = parseInt(month) || (new Date().getMonth() + 1);

        // 1. Bina objek carian (Match Query)
        let matchQuery = {
            year: targetYear,
            month: targetMonth
        };

        // ✅ 2. Jika ada filter State, tambah ke dalam carian
        // Penting: Dalam aggregate, kita mesti tukar string ID kepada ObjectId secara manual
        if (state) {
            matchQuery.state = new mongoose.Types.ObjectId(state);
        }

        // Aggregate data untuk dapatkan statistik per PPD
        const summary = await SchoolEnrollment.aggregate([
            {
                $match: matchQuery // ✅ Guna objek yang dah dibina tadi
            },
            {
                $group: {
                    _id: "$ppd", // Group by PPD ID
                    totalSchools: { $sum: 1 },
                    verifiedCount: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["Verified by PPD", "Approved by JPN"]] }, 1, 0]
                        }
                    },
                    approvedCount: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "Approved by JPN"] }, 1, 0]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "ppds", // Nama collection PPD dalam MongoDB
                    localField: "_id",
                    foreignField: "_id",
                    as: "ppdInfo"
                }
            },
            {
                $unwind: "$ppdInfo"
            },
            {
                $project: {
                    ppdName: "$ppdInfo.name",
                    totalSchools: 1,
                    verifiedCount: 1,
                    approvedCount: 1,
                    progress: {
                        $multiply: [
                            { $divide: ["$verifiedCount", { $max: ["$totalSchools", 1] }] },
                            100
                        ]
                    }
                }
            },
            { $sort: { ppdName: 1 } }
        ]);

        res.json(summary);

    } catch (error) {
        console.error("Summary Error:", error);
        res.status(500).json({ message: "Gagal mendapatkan ringkasan." });
    }
});

// 6. JPN - PENGESAHAN PUKAL (BULK APPROVE PPD)
// Route: PUT /api/enrollment/approve-ppd/:ppdId
router.put('/approve-ppd/:ppdId', auth, async (req, res) => {
    try {
        const { year, month } = req.body;
        const { ppdId } = req.params;

        // Cari semua sekolah dalam PPD ini yang statusnya 'Verified by PPD'
        // dan tukar kepada 'Approved by JPN'
        const result = await SchoolEnrollment.updateMany(
            {
                ppd: ppdId,
                year: parseInt(year),
                month: parseInt(month),
                status: 'Verified by PPD' // Hanya approve yang dah disemak PPD
            },
            {
                $set: { status: 'Approved by JPN' },
                $push: {
                    logs: {
                        action: 'Approved by JPN',
                        user: req.user.id,
                        timestamp: new Date()
                    }
                }
            }
        );

        res.json({
            message: "Pengesahan berjaya.",
            updated: result.modifiedCount
        });

    } catch (error) {
        console.error("Approval Error:", error);
        res.status(500).json({ message: "Gagal membuat pengesahan." });
    }
});

// 7. ADMIN - EKSPORT DATA (JSON UNTUK EXCEL)
// Route: GET /api/enrollment/export?year=2025&month=10&scope=ALL/STATE/PPD&id=...
router.get('/export', auth, async (req, res) => {
    try {
        const { year, month, scope, id } = req.query;

        let query = {
            year: parseInt(year),
            month: parseInt(month)
        };

        // Tapis mengikut skop pilihan Admin
        if (scope === 'PPD' && id) {
            query.ppd = id;
        } else if (scope === 'STATE' && id) {
            query.state = id;
        }
        // Jika scope 'ALL', kita ambil semua (biasanya Admin Pusat)

        const records = await SchoolEnrollment.find(query)
            .populate('ppd', 'name')   // Dapat nama PPD
            .populate('state', 'name') // Dapat nama Negeri
            .sort({ 'state': 1, 'ppd': 1, 'schoolCode': 1 }); // Susunan data

        res.json(records);

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ message: "Gagal mendapatkan data eksport." });
    }
});

// 8. HELPER: DAPATKAN SENARAI PPD/NEGERI (DROPDOWN)
router.get('/options/locations', auth, async (req, res) => {
    try {
        const states = await State.find({}).sort({ name: 1 });
        const ppds = await PPD.find({}).populate('state', 'name').sort({ name: 1 });
        res.json({ states, ppds });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. DAPATKAN TETAPAN SESI (Public/Auth User)
router.get('/settings/:year', auth, async (req, res) => {
    try {
        const settings = await EnrollmentSettings.findOne({ year: req.params.year });
        res.json(settings || {}); // Return object kosong jika belum set
    } catch (error) {
        res.status(500).json({ message: "Ralat mendapatkan tetapan." });
    }
});

// 10. SIMPAN TETAPAN SESI (Admin Sahaja)
router.post('/settings', auth, async (req, res) => {
    try {
        const { year, verifyStartDate, verifyEndDate, approveStartDate, approveEndDate } = req.body;

        // Upsert (Update jika ada, Create jika tiada)
        const settings = await EnrollmentSettings.findOneAndUpdate(
            { year },
            {
                verifyStartDate,
                verifyEndDate,
                approveStartDate,
                approveEndDate,
                updatedBy: req.user.id
            },
            { new: true, upsert: true }
        );

        res.json({ message: "Tetapan berjaya disimpan.", settings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal menyimpan tetapan." });
    }
});

// 11. KPM - RINGKASAN MENGIKUT NEGERI (HELICOPTER VIEW)
// Route: GET /api/enrollment/kpm-summary?year=2025&month=10
router.get('/kpm-summary', auth, async (req, res) => {
    try {
        const { year, month } = req.query;
        const targetYear = parseInt(year) || new Date().getFullYear();
        const targetMonth = parseInt(month) || (new Date().getMonth() + 1);

        const summary = await SchoolEnrollment.aggregate([
            {
                $match: { year: targetYear, month: targetMonth }
            },
            // 1. Group by PPD dahulu untuk dapatkan status setiap PPD
            {
                $group: {
                    _id: "$ppd",
                    state: { $first: "$state" }, // Simpan ID state
                    totalSchools: { $sum: 1 },
                    verifiedCount: {
                        $sum: { $cond: [{ $in: ["$status", ["Verified by PPD", "Approved by JPN"]] }, 1, 0] }
                    },
                    approvedCount: {
                        $sum: { $cond: [{ $eq: ["$status", "Approved by JPN"] }, 1, 0] }
                    }
                }
            },
            // 2. Tentukan adakah PPD ini "Selesai"
            {
                $project: {
                    state: 1,
                    totalSchools: 1,
                    // PPD dianggap selesai semak jika semua sekolah verified/approved
                    isPpdDone: { $eq: ["$totalSchools", "$verifiedCount"] },
                    // PPD dianggap selesai lulus jika semua sekolah approved
                    isJpnDone: { $eq: ["$totalSchools", "$approvedCount"] }
                }
            },
            // 3. Group by STATE pula
            {
                $group: {
                    _id: "$state",
                    totalPPDs: { $sum: 1 },
                    ppdSelesai: { $sum: { $cond: ["$isPpdDone", 1, 0] } },
                    jpnSelesai: { $sum: { $cond: ["$isJpnDone", 1, 0] } },
                    totalSchoolsState: { $sum: "$totalSchools" }
                }
            },
            // 4. Dapatkan Nama Negeri
            {
                $lookup: {
                    from: "states", // Nama collection State
                    localField: "_id",
                    foreignField: "_id",
                    as: "stateInfo"
                }
            },
            { $unwind: "$stateInfo" },
            // 5. Format Output Akhir
            {
                $project: {
                    stateName: "$stateInfo.name",
                    totalPPDs: 1,
                    ppdSelesai: 1,
                    jpnSelesai: 1,
                    // Kira peratusan siap berdasarkan PPD yang selesai semak
                    progress: {
                        $multiply: [
                            { $divide: ["$ppdSelesai", { $max: ["$totalPPDs", 1] }] },
                            100
                        ]
                    }
                }
            },
            { $sort: { stateName: 1 } }
        ]);

        res.json(summary);

    } catch (error) {
        console.error("KPM Summary Error:", error);
        res.status(500).json({ message: "Gagal mendapatkan data KPM." });
    }
});

module.exports = router;