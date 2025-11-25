const express = require('express');
const router = express.Router();
const Report = require('../models/report.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Initiative = require('../models/initiative.model');
const Strategy = require('../models/strategy.model');
const Teras = require('../models/teras.model');
const Policy = require('../models/policy.model');
const excel = require('exceljs');
const User = require('../models/user.model');

// POST /api/reports - Create a new report
// POST /api/reports - Cipta laporan baharu
router.post('/', auth, async (req, res) => {
    try {
        const { initiativeId, period, namaProgram, summary, challenges, nextSteps, currentValue } = req.body;
        const userId = req.user._id || req.user.id;
        const user = req.user; // Data pengguna dari middleware auth.js (tidak dipopulate)

        // 1. Dapatkan Inisiatif
        const initiative = await Initiative.findById(initiativeId);
        if (!initiative) {
            return res.status(404).json({ message: 'Initiative not found.' });
        }

        // 2. ✅ LOGIK KEBENARAN (AUTHORIZATION) YANG DIPERBAIKI
        // Semak jika pengguna dibenarkan untuk hantar laporan bagi inisiatif ini

        // Semakan 1: Ditugaskan secara individu
        const isAssignedIndividually = initiative.assignees.some(id => id.equals(userId));

        // Semakan 2: Ditugaskan kepada Role (cth: 'PPD' dan role pengguna 'PPD')
        const isAssignedToRole = initiative.assignedRole === user.role;

        // Semakan 3: Ditugaskan kepada PPD spesifik (cth: PPD Batu Pahat)
        const isAssignedToPPD = user.ppd && initiative.assignedPPD && initiative.assignedPPD.equals(user.ppd);

        // Semakan 4: Ditugaskan kepada Negeri (JPN)
        // Ini benar jika:
        //    a) Inisiatif ditugaskan kepada Negeri pengguna
        //    b) DAN role pengguna ialah 'Negeri' ATAU 'PPD' (PPD boleh lapor untuk Negeri)
        const isAssignedToState = user.state && initiative.assignedState &&
            initiative.assignedState.equals(user.state) &&
            (user.role === 'Negeri' || user.role === 'PPD');

        // Jika BUKAN Admin DAN GAGAL semua semakan di atas, sekat.
        if (user.role !== 'Admin' && !isAssignedIndividually && !isAssignedToRole && !isAssignedToState && !isAssignedToPPD) {
            return res.status(403).json({ message: 'Anda tidak ditugaskan (atau tidak mempunyai kebenaran) untuk inisiatif ini.' });
        }
        // --- TAMAT SEMAKAN KEBENARAN ---

        // 3. Teruskan dengan logik sedia ada (Update Initiative)
        if (currentValue === undefined) {
            return res.status(400).json({ message: 'Nilai KPI (currentValue) diperlukan.' });
        }

        const newKpiValue = parseFloat(currentValue);
        initiative.kpi.currentValue = newKpiValue;
        initiative.lastReportDate = new Date();

        if (initiative.kpi.target > 0) {
            if (newKpiValue >= initiative.kpi.target) {
                initiative.status = 'Completed';
            } else if (initiative.status === 'Completed' && newKpiValue < initiative.kpi.target) {
                initiative.status = 'Active'; // Kembalikan ke Active jika nilai dikurangkan
            }
        }
        await initiative.save();
        console.log('✓ Initiative KPI updated successfully');

        // 4. Dapatkan data pengguna (dengan populate) untuk "Stamping"
        const currentUser = await User.findById(userId).populate('state', 'name').populate('ppd', 'name');

        const completionRate = initiative.kpi.target > 0
            ? (newKpiValue / initiative.kpi.target) * 100
            : 0;

        // 5. Cipta Laporan Baharu (dengan Stamping yang betul)
        const newReport = new Report({
            initiative: initiativeId,
            owner: userId,
            period,
            namaProgram,
            summary,
            challenges: challenges || '',
            nextSteps: nextSteps || '',
            reportDate: new Date(),

            kpiSnapshot: newKpiValue,
            completionRate: completionRate,
            status: 'Pending Review',

            // Stamping NAMA (bukan ID)
            submittedTier: currentUser.role,
            submittedDepartment: currentUser.department,
            submittedState: currentUser.state ? currentUser.state.name : null,
            submittedPPD: currentUser.ppd ? currentUser.ppd.name : null
        });

        await newReport.save();

        // Populate data untuk dihantar balik ke frontend
        await newReport.populate('owner', 'firstName lastName email');
        await newReport.populate('initiative', 'name kpi status');

        res.status(201).json({
            message: 'Report submitted successfully.',
            data: newReport
        });

    } catch (error) {
        console.error('Error submitting new report:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({
            message: 'Server error submitting report.',
            error: error.message
        });
    }
});

// GET /api/reports - Dapatkan semua laporan (untuk Admin) atau laporan ditapis (untuk tier)
router.get('/', auth, async (req, res) => {
    try {
        const user = req.user; // Ini adalah data pengguna penuh dari 'auth.js'
        let filter = {};

        // ✅ Logik Penapisan Hierarki (Dikemas kini)
        switch (user.role) {
            case 'Admin':
                // Admin nampak semua
                filter = {};
                break;

            case 'Bahagian':
                // ✅ LOGIK KHAS UNTUK BPSH
                if (user.department === 'BPSH') {
                    // BPSH boleh lihat semua laporan 'Negeri', 'PPD', 
                    // dan laporan 'Bahagian' mereka sendiri.
                    filter = {
                        $or: [
                            { submittedTier: 'Negeri' },
                            { submittedTier: 'PPD' },
                            { submittedDepartment: 'BPSH' }
                        ]
                    };
                } else if (user.department) {
                    // Bahagian lain hanya nampak laporan department mereka sendiri
                    filter = { submittedDepartment: user.department };
                } else {
                    // Bahagian tanpa department (jika ada) tidak nampak apa-apa
                    console.warn(`Pengguna Bahagian ${user.email} tiada department.`);
                    filter = { _id: null }; // Hasilkan query kosong (tiada hasil)
                }
                break;

            case 'Negeri':
                // Pengguna 'Negeri' nampak semua laporan dari PPD di bawah negerinya
                const userWithState = await User.findById(user._id).populate('state', 'name');
                if (!userWithState || !userWithState.state) {
                    return res.status(403).json({ message: 'Akaun Negeri anda tidak mempunyai pautan Negeri yang sah.' });
                }
                // Tapis berdasarkan NAMA Negeri (cth: "Johor")
                filter = { submittedState: userWithState.state.name };
                break;

            case 'PPD':
                // Pengguna 'PPD' hanya nampak laporan dari PPDnya sendiri
                const userWithPPD = await User.findById(user._id).populate('ppd', 'name');
                if (!userWithPPD || !userWithPPD.ppd) {
                    return res.status(403).json({ message: 'Akaun PPD anda tidak mempunyai pautan PPD yang sah.' });
                }
                // Tapis berdasarkan NAMA PPD (cth: "PPD Batu Pahat")
                filter = { submittedPPD: userWithPPD.ppd.name };
                break;

            case 'User': // Pengguna biasa
            default:
                // Pengguna biasa ('User') atau yang tidak dikenali dihalang
                return res.status(403).json({
                    message: 'Anda tidak mempunyai kebenaran untuk melihat sumber ini.'
                });
        }

        console.log(`User role '${user.role}' sedang mengambil laporan dengan penapis:`, filter);

        // Guna filter yang telah ditetapkan untuk mencari laporan
        const reports = await Report.find(filter)
            .sort({ createdAt: -1 })
            .populate('owner', 'firstName lastName email')
            .populate({
                path: 'initiative',
                select: 'name status kpi strategy',
                populate: {
                    path: 'strategy',
                    select: 'name teras',
                    populate: {
                        path: 'teras',
                        select: 'name policy',
                        populate: {
                            path: 'policy',
                            select: 'name'
                        }
                    }
                }
            });

        res.json(reports);
    } catch (error) {
        console.error('Ralat semasa mengambil laporan:', error);
        res.status(500).json({ message: 'Ralat server semasa mengambil laporan.' });
    }
});

// ✅ GET /api/reports/my-reports - Get user's own reports WITH POLICY INFO
router.get('/my-reports', auth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;

        console.log('=== Fetching reports for user:', userId, '===');

        // Step 1: Get reports with basic initiative info
        const reports = await Report.find({ owner: userId })
            .sort({ createdAt: -1 })
            .populate('initiative', 'name status kpi strategy')
            .lean();

        console.log(`✓ Found ${reports.length} reports`);

        // Step 2: Get all unique strategy IDs
        const strategyIds = reports
            .map(r => r.initiative?.strategy)
            .filter(Boolean);

        console.log(`  - Found ${strategyIds.length} unique strategies`);

        // Step 3: Fetch strategies with teras and policy
        const strategies = await Strategy.find({
            _id: { $in: strategyIds }
        })
            .populate({
                path: 'teras',
                select: 'name policy',
                populate: {
                    path: 'policy',
                    select: 'name'
                }
            })
            .lean();

        console.log(`  - Loaded ${strategies.length} strategies with policy info`);

        // Step 4: Create strategy map for quick lookup
        const strategyMap = {};
        strategies.forEach(s => {
            strategyMap[s._id.toString()] = s;
            if (s.teras?.policy) {
                console.log(`    Strategy "${s.name}" → Teras "${s.teras.name}" → Policy "${s.teras.policy.name}"`);
            }
        });

        // Step 5: Transform reports with policy info
        const reportsWithPolicy = reports.map(report => {
            let policyName = 'Unassigned Policy';
            let policyId = 'unassigned';

            if (report.initiative?.strategy) {
                const strategyId = report.initiative.strategy.toString();
                const strategy = strategyMap[strategyId];

                if (strategy?.teras?.policy) {
                    policyName = strategy.teras.policy.name;
                    policyId = strategy.teras.policy._id.toString();
                } else {
                    console.warn(`  ⚠️ Report "${report._id}" initiative "${report.initiative.name}" missing policy chain`);
                }
            }

            return {
                ...report,
                initiative: {
                    ...report.initiative,
                    policyName: policyName,
                    policyId: policyId
                }
            };
        });

        console.log('✓ Reports transformed with policy info\n');

        res.json(reportsWithPolicy);

    } catch (error) {
        console.error('Error fetching user reports:', error);
        res.status(500).json({
            message: 'Server error fetching reports.',
            error: error.message
        });
    }
});

/// GET /api/reports/:id - Get single report details
router.get('/:id', auth, async (req, res) => {
    try {
        const report = await Report.findById(req.params.id)
            // 1. Populate Owner (ambil nama & emel)
            .populate('owner', 'firstName lastName email')

            // 2. ✅ Populate Initiative dengan CARA YANG BETUL
            // Kita guna objek { path, select } untuk memilih medan spesifik
            .populate({
                path: 'initiative',
                select: 'name status kpi strategy startDate endDate'
            });

        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        // 3. Logik Kebenaran (Authorization)
        const user = req.user;

        // Admin boleh tengok semua
        if (user.role === 'Admin') {
            return res.json(report);
        }

        // Pemilik laporan boleh tengok
        if (report.owner && report.owner._id.toString() === user._id.toString()) {
            return res.json(report);
        }

        // Bahagian/Negeri/PPD - Semak "cop" pada laporan
        // Jika laporan ini dihantar oleh 'PPD' di bawah 'Johor', maka 'Negeri Johor' boleh tengok

        // Logik mudah: Jika anda 'Negeri', anda boleh tengok laporan yang submittedState == State anda
        if (user.role === 'Negeri' && user.state) {
            // Kita perlu populate state user untuk dapatkan nama
            const userWithState = await User.findById(user._id).populate('state', 'name');
            if (report.submittedState === userWithState.state.name) {
                return res.json(report);
            }
        }

        // Jika anda 'Bahagian' (BPSH), boleh tengok laporan Negeri/PPD
        if (user.role === 'Bahagian' && user.department === 'BPSH') {
            return res.json(report);
        }

        // Jika tiada yang sepadan, sekat
        return res.status(403).json({ message: 'Access denied to this report.' });

    } catch (error) {
        console.error('Error fetching report details:', error);
        res.status(500).json({ message: 'Server error fetching report details.' });
    }
});


// PATCH /api/reports/:id/approve - Approve report (admin only)
router.patch('/:id/approve', [auth, adminAuth], async (req, res) => {
    try {
        const report = await Report.findByIdAndUpdate(
            req.params.id,
            { status: 'Approved' },
            { new: true }
        )
            .populate('owner', 'firstName lastName')
            .populate('initiative', 'name');

        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        res.json({
            message: 'Report approved successfully.',
            report
        });
    } catch (error) {
        console.error('Error approving report:', error);
        res.status(500).json({ message: 'Server error approving report.' });
    }
});

// PATCH /api/reports/:id/status - Update a report's status
// ✅ PATCH /api/reports/:id/status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status, feedback } = req.body;

        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        // Update status dan feedback
        report.status = status || report.status;
        report.feedback = feedback || ''; // ✅ simpan feedback
        report.updatedAt = Date.now();

        await report.save();

        res.json({ message: 'Report updated successfully', report });
    } catch (error) {
        console.error('Error updating report status:', error);
        res.status(500).json({ message: 'Server error updating report status' });
    }
});


// PUT /api/reports/:id - Update/Resubmit report (after revision)
router.put('/:id', auth, async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        // Security: Only report owner can update
        const userId = req.user._id || req.user.id;
        if (report.owner.toString() !== userId.toString()) {
            return res.status(403).json({
                message: 'You are not authorized to update this report.'
            });
        }

        // Only allow updates if status is "Needs Revision"
        if (report.status !== 'Needs Revision') {
            return res.status(400).json({
                message: 'Only reports with "Needs Revision" status can be edited.'
            });
        }

        const { period, summary, challenges, nextSteps, currentValue } = req.body;

        console.log('=== Updating Report ===');
        console.log('Report ID:', req.params.id);
        console.log('Update data:', req.body);

        report.history.push({
            updatedBy: userId,
            updatedAt: new Date(),
            previousData: {
                summary: report.summary,
                challenges: report.challenges,
                nextSteps: report.nextSteps,
                period: report.period,
                completionRate: report.completionRate,
                kpiSnapshot: report.kpiSnapshot // <--- Simpan nilai lama di sini
            }
        });
        // ========================================

        // Update report fields
        if (period) report.period = period;
        if (summary) report.summary = summary;
        if (challenges !== undefined) report.challenges = challenges;
        if (nextSteps !== undefined) report.nextSteps = nextSteps;

        // Update KPI if provided
        if (currentValue !== undefined) {
            const initiative = await Initiative.findById(report.initiative);

            if (initiative) {
                console.log('New initiative KPI:', currentValue);

                // Update initiative
                initiative.kpi.currentValue = parseFloat(currentValue);

                // Recalculate completion rate
                report.completionRate = initiative.kpi.target > 0
                    ? (parseFloat(currentValue) / initiative.kpi.target) * 100
                    : 0;

                // Check if completed
                if (initiative.kpi.currentValue >= initiative.kpi.target) {
                    initiative.status = 'Completed';
                    console.log('✓ Initiative marked as Completed');
                }

                await initiative.save();
                console.log('✓ Initiative updated');
            }
        }

        // Reset status to Pending Review
        report.status = 'Pending Review';
        report.adminFeedback = '';

        const updatedReport = await report.save();
        console.log('✓ Report updated:', updatedReport._id);

        // Populate before sending
        await updatedReport.populate('owner', 'firstName lastName email');
        await updatedReport.populate('initiative', 'name status kpi');

        res.json({
            message: 'Report updated and resubmitted successfully.',
            data: updatedReport
        });

    } catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({
            message: 'Server error while updating report.',
            error: error.message
        });
    }
});

// DELETE /api/reports/:id - Delete report
router.delete('/:id', auth, async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        const userId = req.user._id || req.user.id;
        const isOwner = report.owner.toString() === userId.toString();
        const isAdmin = req.user.role === 'Admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: 'You are not authorized to delete this report.'
            });
        }

        // Halang owner daripada memadam laporan 'Approved' (kekalkan logik ini jika anda mahu)
        if (!isAdmin && report.status === 'Approved') {
            return res.status(403).json({
                message: 'Action denied. Approved reports cannot be deleted by the owner.'
            });
        }

        // 1. Simpan ID inisiatif sebelum padam laporan
        const initiativeId = report.initiative;

        // 2. Padam laporan
        await report.deleteOne();
        console.log('✓ Report deleted:', req.params.id);

        // 3. ✅ ROLLBACK: Cari laporan terkini yang TINGGAL untuk inisiatif ini
        const latestReportRemaining = await Report.findOne({ initiative: initiativeId })
            .sort({ createdAt: -1 }); // Ambil yang paling baru dicipta

        // 4. Kemas kini Inisiatif Induk
        const initiative = await Initiative.findById(initiativeId);
        if (initiative) {
            if (latestReportRemaining) {
                // Jika masih ada laporan lain, guna nilai snapshot laporan itu
                console.log('🔄 Rolling back Initiative KPI to previous report value.');
                // Gunakan kpiSnapshot jika ada, jika tidak (laporan lama), cuba fallback atau set 0
                initiative.kpi.currentValue = latestReportRemaining.kpiSnapshot !== undefined
                    ? latestReportRemaining.kpiSnapshot
                    : (latestReportRemaining.completionRate / 100 * initiative.kpi.target) || 0;

                // Kemaskini tarikh laporan terakhir
                initiative.lastReportDate = latestReportRemaining.createdAt;
            } else {
                // Jika TIADA laporan langsung, reset KPI ke 0
                console.log('🔄 No reports left. Resetting Initiative KPI to 0.');
                initiative.kpi.currentValue = 0;
                initiative.lastReportDate = null;
            }

            // Semak semula status (jika sebelum ini 'Completed' tetapi kini nilai turun bawah target)
            if (initiative.kpi.target > 0) {
                if (initiative.kpi.currentValue < initiative.kpi.target && initiative.status === 'Completed') {
                    initiative.status = 'In Progress'; // Atau status asal yang sesuai
                } else if (initiative.kpi.currentValue >= initiative.kpi.target) {
                    initiative.status = 'Completed';
                }
            }

            await initiative.save();
            console.log('✓ Initiative updated after report deletion.');
        }

        res.json({ message: 'Report deleted and initiative adjusted successfully.' });

    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({
            message: 'Failed to delete report.',
            error: error.message
        });
    }
});

// GET /api/reports/by-initiative/:initiativeId - Get the latest report for an initiative
router.get('/by-initiative/:initiativeId', auth, async (req, res) => {
    try {
        const report = await Report.findOne({ initiative: req.params.initiativeId })
            .sort({ createdAt: -1 }) // ambil report terkini
            .populate('initiative', 'name status kpi')
            .populate('owner', 'firstName lastName');

        if (!report) {
            return res.status(404).json({ message: 'No report found for this initiative.' });
        }

        res.json(report);
    } catch (error) {
        console.error('Error fetching latest report:', error);
        res.status(500).json({ message: 'Server error fetching report.' });
    }
});

// GET /api/reports/download/:policyId - Menjana dan memuat turun laporan Excel
router.get('/download/:policyId', [auth, adminAuth], async (req, res) => {
    try {
        const policyId = req.params.policyId;

        // 1. Dapatkan semua data hierarki
        const policy = await Policy.findById(policyId).lean();
        if (!policy) return res.status(404).json({ message: "Policy not found." });

        const terasItems = await Teras.find({ policy: policyId }).lean();
        const terasIds = terasItems.map(t => t._id);

        const strategies = await Strategy.find({ teras: { $in: terasIds } }).lean();
        const strategyIds = strategies.map(s => s._id);

        const initiatives = await Initiative.find({ strategy: { $in: strategyIds } }).lean();

        // 2. Cipta Workbook Excel
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet(policy.name.substring(0, 30)); // Hadkan nama tab

        // 3. Tentukan Kolum
        worksheet.columns = [
            { header: 'Polisi', key: 'policy', width: 30 },
            { header: 'Teras', key: 'teras', width: 30 },
            { header: 'Strategi', key: 'strategy', width: 30 },
            { header: 'Inisiatif', key: 'initiative', width: 40 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'KPI Target', key: 'target', width: 15 },
            { header: 'KPI Current', key: 'current', width: 15 },
            { header: 'Unit KPI', key: 'unit', width: 15 },
            { header: 'Tarikh Laporan Terkini', key: 'reportDate', width: 20 },
            { header: 'Laporan Terkini', key: 'report', width: 50 },
        ];

        // Jadikan header tebal (bold)
        worksheet.getRow(1).font = { bold: true };

        // 4. Proses dan tambah data baris demi baris
        for (const teras of terasItems) {
            const terasStrategies = strategies.filter(s => s.teras.toString() === teras._id.toString());

            for (const strategy of terasStrategies) {
                const strategyInitiatives = initiatives.filter(i => i.strategy.toString() === strategy._id.toString());

                if (strategyInitiatives.length === 0) {
                    // Tambah baris walaupun tiada inisiatif
                    worksheet.addRow({
                        policy: policy.name,
                        teras: teras.name,
                        strategy: strategy.name,
                        initiative: "N/A",
                    });
                } else {
                    for (const initiative of strategyInitiatives) {
                        // Cari laporan terkini untuk inisiatif ini
                        const latestReport = await Report.findOne({ initiative: initiative._id }).sort({ createdAt: -1 });

                        worksheet.addRow({
                            policy: policy.name,
                            teras: teras.name,
                            strategy: strategy.name,
                            initiative: initiative.name,
                            status: initiative.status,
                            target: initiative.kpi.target,
                            current: initiative.kpi.currentValue || 0,
                            unit: initiative.kpi.unit,
                            reportDate: latestReport ? new Date(latestReport.createdAt).toLocaleDateString() : "N/A",
                            report: latestReport ? latestReport.summary : "No report submitted."
                        });
                    }
                }
            }
        }

        // Tetapkan format tarikh untuk lajur 'reportDate' (Pilihan, tetapi cantik)
        worksheet.getColumn('reportDate').numFmt = 'dd/mm/yyyy';

        // 5. Hantar fail Excel kepada pengguna
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="Laporan_${policy.name}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error generating Excel report:", error);
        res.status(500).json({ message: 'Server error generating report.' });
    }
});


module.exports = router;