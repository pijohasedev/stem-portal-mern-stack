const express = require('express');
const router = express.Router();
const Initiative = require('../models/initiative.model');
const Report = require('../models/report.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Strategy = require('../models/strategy.model');
const User = require('../models/user.model');

// ✅ FUNGSI HELPER BARU: Untuk mengira status berdasarkan tarikh
function getStatusByDate(startDateStr, endDateStr, currentStatus) {
    // Jika status sedia ada 'Completed', jangan ubah apa-apa.
    if (currentStatus === 'Completed') {
        return 'Completed';
    }

    // Pastikan kita ada tarikh yang sah
    if (!startDateStr || !endDateStr) {
        return 'Active'; // Default jika tarikh tiada, anggap 'Active'
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalisasi 'hari ini' ke permulaan hari (tengah malam)

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Normalisasi tarikh input
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999); // Set ke PENGHUJUNG hari

    if (today > endDate) {
        return 'At Risk'; // Melebihi tarikh tamat
    }
    if (today >= startDate && today <= endDate) {
        return 'Active'; // Dalam tempoh pelaksanaan
    }
    if (today < startDate) {
        return 'Planning'; // Belum mula
    }

    return 'Planning'; // Default jika tiada syarat sepadan
}


// GET /api/initiatives - Gets a list of initiatives with automatic status updates
// GET all initiatives (with role-based filtering)
router.get('/', auth, async (req, res) => {
    try {
        let query = {};
        // --- THIS IS THE FIX ---
        // If the logged-in user is an owner, modify the query to
        // find initiatives where their ID is in the 'assignees' array.
        if (req.user.role === 'owner') {
            query.assignees = req.user.id;
        }

        // The automatic status update logic
        const initiativesFromDB = await Initiative.find(query);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const initiative of initiativesFromDB) {
            let statusChanged = false;
            if (initiative.status === 'At Risk' && initiative.endDate && initiative.endDate >= today) {
                initiative.status = (initiative.startDate && initiative.startDate > today) ? 'Planning' : 'Active';
                statusChanged = true;
            }
            if (initiative.status === 'Planning' && initiative.startDate && initiative.startDate <= today) {
                initiative.status = 'Active';
                statusChanged = true;
            }
            if ((initiative.status === 'Active' || initiative.status === 'Planning') && initiative.endDate && initiative.endDate < today) {
                const progress = initiative.kpi.target > 0 ? ((initiative.kpi.currentValue || 0) / initiative.kpi.target) * 100 : 0;
                if (progress < 100) {
                    initiative.status = 'At Risk';
                    statusChanged = true;
                }
            }
            if (statusChanged) {
                await initiative.save();
            }
        }

        // Fetch the final, populated data using the same query
        const populatedInitiatives = await Initiative.find(query)
            .populate('assignees', 'firstName lastName')
            .lean();

        res.json(populatedInitiatives);

    } catch (err) {
        console.error("Error in GET /api/initiatives:", err);
        res.status(500).json({ message: 'Error fetching initiatives' });
    }
});

// --- POST /api/initiatives ---
// Creates a new initiative (Admin Only)
// POST /api/initiatives - Cipta inisiatif baharu (Admin sahaja)
router.post('/', [auth, adminAuth], async (req, res) => {
    try {
        // 1. Ambil SEMUA medan tugasan dari req.body
        const {
            name, strategy, kpi, assignees,
            assignedRole, assignedState, assignedPPD
        } = req.body;

        // 2. Kemas kini validasi asas
        if (!name || !strategy || !kpi) {
            return res.status(400).json({ message: 'Medan Nama, Strategi, dan KPI diperlukan.' });
        }

        // 3. Validasi bahawa sekurang-kurangnya SATU jenis tugasan ada
        // (Borang frontend sepatutnya sudah menguruskan ini, tetapi baik untuk ada semakan di backend)
        const hasIndividualAssignee = assignees && assignees.length > 0;
        const hasGroupAssignment = assignedRole || assignedState || assignedPPD;

        if (!hasIndividualAssignee && !hasGroupAssignment) {
            return res.status(400).json({ message: 'Inisiatif mesti ditugaskan kepada individu atau kumpulan.' });
        }

        // 4. Cipta Inisiatif Baharu dengan semua medan
        // (Kita juga akan tambah 'policy' yang diambil secara automatik dari 'strategy')
        const strategyDoc = await Strategy.findById(strategy).populate({
            path: 'teras',
            select: 'policy'
        });

        if (!strategyDoc || !strategyDoc.teras?.policy) {
            return res.status(400).json({ message: 'Strategi tidak sah atau tiada pautan ke Polisi.' });
        }

        const newInitiative = new Initiative({
            name,
            strategy,
            policy: strategyDoc.teras.policy, // ✅ Auto-tambah 'policy'
            kpi,
            // Data Tugasan: Simpan semua (frontend akan hantar array kosong atau null)
            assignees: hasGroupAssignment ? [] : (assignees || []), // Kosongkan individu jika tugasan kumpulan
            assignedRole: assignedRole || null,
            assignedState: assignedState || null,
            assignedPPD: assignedPPD || null
            // Status akan default kepada 'Pending Acceptance' dari model
        });

        await newInitiative.save();
        res.status(201).json({ message: 'Initiative created successfully!', data: newInitiative });

    } catch (err) {
        if (err.name === 'ValidationError') {
            const message = Object.values(err.errors).map(val => val.message).join(', ');
            return res.status(400).json({ message });
        }
        console.error('Server error creating initiative:', err); // Log ralat
        res.status(500).json({ message: 'Server error creating initiative.' });
    }
});

// --- GET /api/initiatives/:id ---
// Gets a single initiative by its ID (for View Details)
router.get('/:id', auth, async (req, res) => {
    try {
        const initiative = await Initiative.findById(req.params.id)
            .populate('assignees', 'firstName lastName')
            .populate('strategy', 'name')
            .lean();

        if (!initiative) {
            return res.status(404).json({ message: 'Initiative not found' });
        }

        // ✅ Hanya semak pemilikan kalau field owner wujud
        if (
            req.user.role !== 'admin' &&
            initiative.owner &&
            initiative.owner._id &&
            initiative.owner._id.toString() !== req.user.id
        ) {
            return res.status(403).json({ message: 'User not authorized.' });
        }

        res.json(initiative);
    } catch (error) {
        console.error('Error fetching initiative by ID:', error);
        res.status(500).json({ message: 'Server error fetching initiative.' });
    }
});


// --- PUT /api/initiatives/:id ---
// Updates an initiative by its ID (Admin Only)
router.put('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const updatedInitiative = await Initiative.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedInitiative) {
            return res.status(404).json({ message: "Initiative not found" });
        }
        res.json({ message: 'Initiative updated successfully!', initiative: updatedInitiative });
    } catch (error) {
        res.status(500).json({ message: 'Server error updating initiative.' });
    }
});

// --- PATCH /api/initiatives/:id/accept ---
// ✅ PATCH /api/initiatives/:id/accept - Terima inisiatif (DIKEMASKINI)
router.patch('/:id/accept', auth, async (req, res) => {
    try {
        // 1. Dapatkan tarikh dari frontend (PlanInitiativeModal)
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Tarikh Mula dan Tarikh Tamat diperlukan.' });
        }

        const initiative = await Initiative.findById(req.params.id);
        if (!initiative) {
            return res.status(404).json({ message: 'Inisiatif tidak ditemui.' });
        }

        // 2. Logik Kebenaran (Authorization - kekal sama)
        const user = req.user;
        const userId = user._id;

        const isAssignedIndividually = initiative.assignees.some(id => id.equals(userId));
        const isAssignedToRole = initiative.assignedRole === user.role;
        const isAssignedToState = user.state && initiative.assignedState && initiative.assignedState.equals(user.state);
        const isAssignedToPPD = user.ppd && initiative.assignedPPD && initiative.assignedPPD.equals(user.ppd);

        if (!isAssignedIndividually && !isAssignedToRole && !isAssignedToState && !isAssignedToPPD) {
            return res.status(403).json({ message: 'Anda tidak ditugaskan untuk inisiatif ini.' });
        }
        // --- Tamat Semakan Kebenaran ---

        // 3. ✅ LOGIK STATUS BAHARU: Guna fungsi helper
        const newStatus = getStatusByDate(startDate, endDate, initiative.status);

        initiative.status = newStatus;
        initiative.startDate = startDate;
        initiative.endDate = endDate;

        await initiative.save();
        res.json({ message: 'Inisiatif diterima dan dirancang.', initiative });

    } catch (error) {
        console.error('Error accepting initiative:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/initiatives/:id/dates - Update an initiative's dates (Admin Only)
router.patch('/:id/dates', [auth, adminAuth], async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Both start date and end date are required.' });
        }

        const updatedInitiative = await Initiative.findByIdAndUpdate(
            req.params.id,
            { startDate, endDate },
            { new: true } // This option returns the updated document
        );

        if (!updatedInitiative) {
            return res.status(404).json({ message: 'Initiative not found.' });
        }

        res.json({ message: 'Initiative dates updated successfully.', data: updatedInitiative });
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating dates.' });
    }
});

// DELETE /api/initiatives/:id - Delete an initiative (Admin Only)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const initiative = await Initiative.findByIdAndDelete(req.params.id);

        if (!initiative) {
            return res.status(404).json({ message: 'Initiative not found.' });
        }

        // Good Practice: In a real app, you might also want to delete all reports 
        // associated with this initiative. For now, we'll just delete the initiative itself.

        res.json({ message: 'Initiative permanently deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting initiative.' });
    }
});

module.exports = router;