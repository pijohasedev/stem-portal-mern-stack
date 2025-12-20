const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
// 👇 Ini nama variable yang betul: SchoolEnrollment
const SchoolEnrollment = require('../models/SchoolEnrollment');
const auth = require('../middleware/auth');
const User = require('../models/user.model');
const PPD = require('../models/ppd.model');
const State = require('../models/state.model');
const EnrollmentSettings = require('../models/EnrollmentSettings');
const excel = require('exceljs');
const logActivity = require('../utils/logger');

// 1. DAPATKAN SENARAI SEKOLAH (PPD VIEW & ADMIN VIEW)
router.get('/my-district', auth, async (req, res) => {
    try {
        const { year, month } = req.query;
        const user = await User.findById(req.user.id);

        let query = {
            year: year || new Date().getFullYear(),
            month: month || (new Date().getMonth() + 1)
        };

        if (user.role === 'PPD' || (user.role !== 'Admin' && user.ppd)) {
            if (!user.ppd) {
                return res.status(403).json({ message: "Anda tidak mempunyai PPD yang ditetapkan." });
            }
            query.ppd = user.ppd;
        }

        const records = await SchoolEnrollment.find(query)
            .populate('ppd', 'name')
            .sort({ ppd: 1, schoolCode: 1 });

        res.json(records);

    } catch (error) {
        console.error("Error fetching records:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// 1.5 SENARAI SEKOLAH UNTUK DISEMAK (ADMIN & PPD & JPN)
router.get('/verify', auth, async (req, res) => {
    try {
        const { year, month, state, ppd } = req.query;

        console.log("--- DEBUG /verify ---");
        console.log("User Role:", req.user.role);

        let query = {
            year: parseInt(year) || new Date().getFullYear(),
            month: parseInt(month) || (new Date().getMonth() + 1)
        };

        const userRole = (req.user.role || "").toLowerCase();
        const currentUser = await User.findById(req.user.id);

        if (userRole === 'ppd') {
            if (!currentUser.ppd) return res.status(403).json({ message: "Akaun PPD tiada ID sah." });
            query.ppd = currentUser.ppd;

        } else if (userRole === 'negeri') {
            if (!currentUser.state) return res.status(403).json({ message: "Akaun JPN tiada ID Negeri sah." });
            query.state = currentUser.state;

            // JPN filter PPD
            if (ppd && ppd !== 'ALL' && ppd !== 'undefined') {
                query.ppd = ppd;
            }

        } else if (['admin', 'bahagian'].includes(userRole)) {
            if (state && state !== 'ALL' && state !== 'undefined') query.state = state;
            if (ppd && ppd !== 'ALL' && ppd !== 'undefined') query.ppd = ppd;
        }

        console.log("Final Mongo Query:", query);

        const schools = await SchoolEnrollment.find(query)
            .populate('ppd', 'name')
            .populate('state', 'name')
            .sort({ 'ppd': 1, 'schoolName': 1 });

        console.log(`Jumpa ${schools.length} rekod.`);
        res.json(schools);

    } catch (error) {
        console.error("Error fetching verification list:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// 2. KEMASKINI & SAHKAN DATA (PPD ACTION)
router.put('/:id/verify', auth, async (req, res) => {
    try {
        const record = await SchoolEnrollment.findById(req.params.id);
        if (!record) return res.status(404).json({ message: "Rekod tidak dijumpai" });

        if (req.user.role !== 'Admin') {
            const settings = await EnrollmentSettings.findOne({ year: record.year });
            const now = new Date();

            if (!settings || !settings.verifyStartDate || !settings.verifyEndDate) {
                return res.status(403).json({ message: "Sesi semakan belum dibuka oleh Admin." });
            }

            const endDate = new Date(settings.verifyEndDate);
            endDate.setHours(23, 59, 59, 999);

            if (now < new Date(settings.verifyStartDate)) return res.status(403).json({ message: "Sesi belum bermula." });
            if (now > endDate) return res.status(403).json({ message: "Sesi telah ditutup." });
        }

        const { verifiedData } = req.body;
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

// 3. ADMIN - CREATE INITIAL DATA (Testing)
router.post('/init', auth, async (req, res) => {
    try {
        const newRecord = new SchoolEnrollment(req.body); // ✅ Betul
        await newRecord.save();
        res.json(newRecord);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. ADMIN - IMPORT PUKAL
router.post('/import', auth, async (req, res) => {
    const { year, month, data } = req.body;
    if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Tiada data untuk diproses." });
    }

    try {
        console.log("Memulakan import...");
        const allPPDs = await PPD.find({});
        const allStates = await State.find({});

        const ppdMap = {};
        allPPDs.forEach(p => ppdMap[p.name.toUpperCase().trim()] = p._id);

        const stateMap = {};
        allStates.forEach(s => stateMap[s.name.toUpperCase().trim()] = s._id);

        const bulkOps = [];
        const errors = [];

        for (const item of data) {
            const ppdName = (item.ppdName || "").toUpperCase().trim();
            const stateName = (item.stateName || "").toUpperCase().trim();

            const foundPPDId = ppdMap[ppdName];
            let foundStateId = stateMap[stateName];

            if (!foundStateId && foundPPDId) {
                const ppdObj = allPPDs.find(p => p._id === foundPPDId);
                if (ppdObj && ppdObj.state) foundStateId = ppdObj.state;
            }

            if (!foundPPDId) {
                errors.push(`PPD tidak dijumpai: ${item.ppdName} (Sekolah: ${item.schoolName})`);
                continue;
            }

            const updateDoc = {
                schoolName: item.schoolName,
                schoolType: item.schoolType || 'SMK',
                ppd: foundPPDId,
                state: foundStateId,
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
                status: 'Pending Verification',
                $push: {
                    logs: { action: 'Bulk Import', user: req.user.id, timestamp: new Date() }
                }
            };

            bulkOps.push({
                updateOne: {
                    filter: { schoolCode: item.schoolCode, year: Number(year), month: Number(month) },
                    update: { $set: updateDoc },
                    upsert: true
                }
            });
        }

        let result = { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        if (bulkOps.length > 0) {
            result = await SchoolEnrollment.bulkWrite(bulkOps); // ✅ Betul
        }

        res.json({
            message: "Proses import selesai.",
            success: bulkOps.length,
            failed: errors.length,
            errors: errors.slice(0, 10),
            details: result
        });

    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).json({ message: "Ralat import: " + error.message });
    }
});

// 5. JPN - RINGKASAN STATUS MENGIKUT PPD
router.get('/summary', auth, async (req, res) => {
    try {
        const { year, month, state } = req.query;
        const targetYear = parseInt(year) || new Date().getFullYear();
        const targetMonth = parseInt(month) || (new Date().getMonth() + 1);

        let matchQuery = { year: targetYear, month: targetMonth };

        if (state) {
            matchQuery.state = new mongoose.Types.ObjectId(state);
        }

        const summary = await SchoolEnrollment.aggregate([ // ✅ Betul
            { $match: matchQuery },
            {
                $group: {
                    _id: "$ppd",
                    totalSchools: { $sum: 1 },
                    verifiedCount: { $sum: { $cond: [{ $in: ["$status", ["Verified by PPD", "Approved by JPN"]] }, 1, 0] } },
                    approvedCount: { $sum: { $cond: [{ $eq: ["$status", "Approved by JPN"] }, 1, 0] } }
                }
            },
            {
                $lookup: {
                    from: "ppds",
                    localField: "_id",
                    foreignField: "_id",
                    as: "ppdInfo"
                }
            },
            { $unwind: "$ppdInfo" },
            {
                $project: {
                    ppdName: "$ppdInfo.name",
                    totalSchools: 1,
                    verifiedCount: 1,
                    approvedCount: 1,
                    progress: {
                        $multiply: [{ $divide: ["$verifiedCount", { $max: ["$totalSchools", 1] }] }, 100]
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
router.put('/approve-ppd/:ppdId', auth, async (req, res) => {
    try {
        const { year, month } = req.body;
        const { ppdId } = req.params;

        const result = await SchoolEnrollment.updateMany( // ✅ Betul
            {
                ppd: ppdId,
                year: parseInt(year),
                month: parseInt(month),
                status: 'Verified by PPD'
            },
            {
                $set: { status: 'Approved by JPN' },
                $push: { logs: { action: 'Approved by JPN', user: req.user.id, timestamp: new Date() } }
            }
        );

        res.json({ message: "Pengesahan berjaya.", updated: result.modifiedCount });
    } catch (error) {
        console.error("Approval Error:", error);
        res.status(500).json({ message: "Gagal membuat pengesahan." });
    }
});

// 7. GET /api/enrollment/export (ROUTE YANG DIBAIKI)
// GET /api/enrollment/export (DIPERBETULKAN)
router.get('/export', auth, async (req, res) => {
    try {
        const user = req.user;
        const { year, month, state, ppd } = req.query;

        console.log(`[EXPORT] User: ${user.role}, Year: ${year}, State: ${state}, PPD: ${ppd}`);

        // 1. Filter Asas
        let filter = {};
        if (year) filter.year = parseInt(year);
        if (month && month !== 'ALL') filter.month = parseInt(month);

        let fileNameLabel = "Nasional";

        // 2. Logic Filter (Sama macam sebelum ini)
        if (user.role === 'Negeri') {
            const userDetail = await User.findById(user.id).populate('state', 'name');
            if (!userDetail.state) return res.status(400).json({ message: "Akaun JPN tiada negeri." });
            filter.state = userDetail.state._id;
            fileNameLabel = userDetail.state.name;
            if (ppd && ppd !== 'ALL') {
                filter.ppd = ppd;
                fileNameLabel += "_PPD";
            }
        } else if (user.role === 'PPD') {
            const userDetail = await User.findById(user.id).populate('ppd', 'name');
            filter.ppd = userDetail.ppd._id;
            fileNameLabel = userDetail.ppd.name;
        } else if (user.role === 'Admin') {
            if (state && state !== 'ALL') {
                filter.state = state;
                fileNameLabel = "Negeri";
            }
            if (ppd && ppd !== 'ALL') {
                filter.ppd = ppd;
                fileNameLabel = "PPD";
            }
        }

        // 3. Tarik Data
        const enrollments = await SchoolEnrollment.find(filter)
            .populate('state', 'name')
            .populate('ppd', 'name')
            .sort({ 'state': 1, 'ppd': 1, 'schoolName': 1 });

        // 4. Generate Excel
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Enrolmen');

        // ✅ FORMAT LAJUR DIPERBAIKI (Ikut fail 'Good')
        worksheet.columns = [
            { header: 'Negeri', key: 'state', width: 20 },
            { header: 'PPD', key: 'ppd', width: 25 },
            { header: 'Kod Sekolah', key: 'code', width: 12 },
            { header: 'Nama Sekolah', key: 'school', width: 40 },
            { header: 'Jenis', key: 'type', width: 25 },
            { header: 'STEM A', key: 'stemA', width: 10 },
            { header: 'STEM B', key: 'stemB', width: 10 },
            { header: 'STEM C1', key: 'stemC1', width: 10 },
            { header: 'STEM C2', key: 'stemC2', width: 10 },
            { header: 'Kategori E', key: 'catE', width: 12 },
            { header: 'Kategori F', key: 'catF', width: 12 },
            { header: 'Bukan STEM', key: 'nonStem', width: 12 },
            { header: 'Jumlah Murid', key: 'total', width: 15 },
            { header: '% Enrolmen', key: 'percent', width: 15 },
            { header: 'Status Pengesahan', key: 'status', width: 20 },
            { header: 'Sumber Data', key: 'source', width: 20 },
        ];
        worksheet.getRow(1).font = { bold: true };

        enrollments.forEach(rec => {
            // ✅ LOGIK DATA: Pilih verifiedData jika ada, kalau tak guna systemData
            const isVerified = rec.status === 'Verified by PPD' || rec.status === 'Approved by JPN';
            // Pastikan kita check verifiedData ada content atau tidak
            const hasVerifiedData = rec.verifiedData && rec.verifiedData.totalStudents > 0;

            // Data yang akan digunakan
            const data = (isVerified || hasVerifiedData) ? rec.verifiedData : rec.systemData;

            // Fallback object jika data kosong (elak error undefined)
            const safeData = data || {
                stemA: 0, stemB: 0, stemC1: 0, stemC2: 0,
                categoryE: 0, categoryF: 0, nonStem: 0, totalStudents: 0
            };

            worksheet.addRow({
                state: rec.state?.name || '-',
                ppd: rec.ppd?.name || '-',
                code: rec.schoolCode || '-', // Pastikan field nama betul (schoolCode/code)
                school: rec.schoolName,
                type: rec.schoolType || 'SMK',

                // ✅ MAPPING FIELD YANG BETUL
                stemA: safeData.stemA || 0,
                stemB: safeData.stemB || 0,
                stemC1: safeData.stemC1 || 0,
                stemC2: safeData.stemC2 || 0,
                catE: safeData.categoryE || 0,
                catF: safeData.categoryF || 0,
                nonStem: safeData.nonStem || 0,
                total: safeData.totalStudents || 0,

                // Pengiraan Semula Peratus (Optional: nak guna rec.percentage pun boleh)
                percent: rec.percentage ? `${rec.percentage.toFixed(2)}%` : '0.00%',

                status: rec.status || 'Draft',
                source: isVerified ? "Disahkan PPD" : "Data Asal KPM"
            });
        });

        await logActivity(req.user.id, 'EXPORT_DATA', `Eksport Enrolmen (${fileNameLabel})`, req);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Laporan_${fileNameLabel}_${Date.now()}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("[EXPORT ERROR]", error);
        res.status(500).json({ message: "Server Error semasa menjana Excel." });
    }
});

// 8. HELPER: OPTIONS
router.get('/options/locations', auth, async (req, res) => {
    try {
        const states = await State.find({}).sort({ name: 1 });
        const ppds = await PPD.find({}).populate('state', 'name').sort({ name: 1 });
        res.json({ states, ppds });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. DAPATKAN TETAPAN SESI
router.get('/settings/:year', auth, async (req, res) => {
    try {
        const settings = await EnrollmentSettings.findOne({ year: req.params.year });
        res.json(settings || {});
    } catch (error) {
        res.status(500).json({ message: "Ralat mendapatkan tetapan." });
    }
});

// 10. SIMPAN TETAPAN SESI
router.post('/settings', auth, async (req, res) => {
    try {
        const { year, verifyStartDate, verifyEndDate, approveStartDate, approveEndDate } = req.body;
        const settings = await EnrollmentSettings.findOneAndUpdate(
            { year },
            {
                verifyStartDate, verifyEndDate, approveStartDate, approveEndDate,
                updatedBy: req.user.id
            },
            { new: true, upsert: true }
        );
        res.json({ message: "Tetapan berjaya disimpan.", settings });
    } catch (error) {
        res.status(500).json({ message: "Gagal menyimpan tetapan." });
    }
});

// 11. KPM - RINGKASAN MENGIKUT NEGERI (HELICOPTER VIEW)
router.get('/kpm-summary', auth, async (req, res) => {
    try {
        const { year, month } = req.query;
        const targetYear = parseInt(year) || new Date().getFullYear();
        const targetMonth = parseInt(month) || (new Date().getMonth() + 1);

        const summary = await SchoolEnrollment.aggregate([ // ✅ Betul
            {
                $match: { year: targetYear, month: targetMonth }
            },
            {
                $group: {
                    _id: "$ppd",
                    state: { $first: "$state" },
                    totalSchools: { $sum: 1 },
                    verifiedCount: { $sum: { $cond: [{ $in: ["$status", ["Verified by PPD", "Approved by JPN"]] }, 1, 0] } },
                    approvedCount: { $sum: { $cond: [{ $eq: ["$status", "Approved by JPN"] }, 1, 0] } }
                }
            },
            {
                $project: {
                    state: 1,
                    totalSchools: 1,
                    isPpdDone: { $eq: ["$totalSchools", "$verifiedCount"] },
                    isJpnDone: { $eq: ["$totalSchools", "$approvedCount"] }
                }
            },
            {
                $group: {
                    _id: "$state",
                    totalPPDs: { $sum: 1 },
                    ppdSelesai: { $sum: { $cond: ["$isPpdDone", 1, 0] } },
                    jpnSelesai: { $sum: { $cond: ["$isJpnDone", 1, 0] } },
                    totalSchoolsState: { $sum: "$totalSchools" }
                }
            },
            {
                $lookup: {
                    from: "states",
                    localField: "_id",
                    foreignField: "_id",
                    as: "stateInfo"
                }
            },
            { $unwind: "$stateInfo" },
            {
                $project: {
                    stateName: "$stateInfo.name",
                    totalPPDs: 1,
                    ppdSelesai: 1,
                    jpnSelesai: 1,
                    progress: {
                        $multiply: [{ $divide: ["$ppdSelesai", { $max: ["$totalPPDs", 1] }] }, 100]
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