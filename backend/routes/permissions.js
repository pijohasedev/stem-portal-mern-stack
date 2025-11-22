// backend/routes/permissions.js (PATCHED)
const express = require('express');
const router = express.Router();
const Permission = require('../models/permission.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const ALL_PAGE_IDS = ['dashboard', 'users', 'planning', 'initiatives', 'reports', 'submit-report', 'report-history', 'report-details'];

function normalizeRoleInput(roleInput) {
    // Jika middleware letak role sebagai object, cuba ambil string
    if (!roleInput) return null;
    if (typeof roleInput === 'string') return roleInput;
    if (typeof roleInput === 'object') {
        // common fields: role, name
        return roleInput.role || roleInput.name || null;
    }
    return null;
}

function ensureAllowedPagesArray(doc) {
    if (!doc) return doc;
    // Pastikan allowedPages wujud dan adalah array
    if (!Array.isArray(doc.allowedPages)) {
        doc.allowedPages = [];
    }
    return doc;
}

// GET /api/permissions - Dapatkan semua setting (Admin sahaja)
router.get('/', [auth, adminAuth], async (req, res) => {
    try {
        const permissions = await Permission.find().sort({ role: 1 }).lean();
        // Normalise setiap dokumen supaya allowedPages sentiasa array
        const normalized = permissions.map(p => {
            p.allowedPages = Array.isArray(p.allowedPages) ? p.allowedPages : [];
            return p;
        });
        console.log('📋 Fetched all permissions:', normalized.length, 'roles');
        res.json(normalized);
    } catch (error) {
        console.error('❌ Error fetching permissions:', error);
        res.status(500).json({ message: 'Server error fetching permissions.' });
    }
});

// POST /api/permissions/update - Kemas kini permission untuk satu role
router.post('/update', [auth, adminAuth], async (req, res) => {
    let { role, allowedPages } = req.body;

    // Normalize and validation
    role = normalizeRoleInput(role);
    if (!role || !Array.isArray(allowedPages)) {
        return res.status(400).json({ message: 'Data tidak lengkap atau format salah.' });
    }

    // Optional: enforce role in enum
    const validRoles = ['Admin', 'Bahagian', 'Negeri', 'PPD', 'User'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: `Role tidak sah: ${role}` });
    }

    try {
        console.log(`🔄 Updating permissions for role: ${role}`, allowedPages);

        // Jika admin, anda mungkin mahu pastikan Admin sentiasa full access.
        if (role === 'Admin') {
            allowedPages = ALL_PAGE_IDS.slice();
        }

        const updatedPermission = await Permission.findOneAndUpdate(
            { role: role },
            {
                $set: {
                    allowedPages: allowedPages,
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        // Normalise before sending back
        ensureAllowedPagesArray(updatedPermission);

        console.log('✅ Permission updated successfully:', updatedPermission);

        res.json({
            message: `Kebenaran untuk ${role} berjaya dikemas kini.`,
            data: updatedPermission,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error updating permission:', error);
        res.status(500).json({ message: 'Gagal mengemas kini kebenaran.' });
    }
});

// GET /api/permissions/my-permissions
router.get('/my-permissions', auth, async (req, res) => {
    try {
        // Normalize role value from req.user
        let userRole = normalizeRoleInput(req.user?.role) || normalizeRoleInput(req.user);

        console.log("------------------------------------------------");
        console.log(`🔍 [Backend] User ${req.user?.firstName || 'unknown'} meminta permission.`);
        console.log(`🔍 [Backend] Role User: '${userRole}' (Jenis: ${typeof userRole})`);

        if (!userRole) {
            console.warn('[Backend] No role present on req.user. Returning empty allowedPages.');
            return res.json({ role: null, allowedPages: [] });
        }

        const permission = await Permission.findOne({ role: userRole }).lean();

        if (permission) {
            ensureAllowedPagesArray(permission);
            console.log("✅ [Backend] Jumpa Permission!", permission.allowedPages);
            res.json({ role: userRole, allowedPages: permission.allowedPages });
        } else {
            console.log("❌ [Backend] TIDAK JUMPA rekod permission untuk role ini.");

            // Debugging Tambahan: Tunjuk semua role yang ADA dalam database
            const allRoles = await Permission.find({}, 'role').lean();
            console.log("ℹ️ [Backend] Role yang wujud dalam DB:", allRoles.map(p => p.role));

            res.json({ role: userRole, allowedPages: [] });
        }
        console.log("------------------------------------------------");

    } catch (error) {
        console.error("Permission error:", error);
        res.status(500).json({ message: 'Error checking permissions' });
    }
});

// GET /api/permissions/check-updates - Check if permissions were updated
router.get('/check-updates', auth, async (req, res) => {
    try {
        let userRole = normalizeRoleInput(req.user?.role) || normalizeRoleInput(req.user);
        if (!userRole) {
            return res.json({
                hasUpdates: false,
                lastUpdate: null
            });
        }
        const permission = await Permission.findOne({ role: userRole }).lean();

        if (!permission) {
            return res.json({
                hasUpdates: false,
                lastUpdate: null
            });
        }

        ensureAllowedPagesArray(permission);

        res.json({
            hasUpdates: true,
            lastUpdate: permission.updatedAt || permission.createdAt,
            allowedPages: permission.allowedPages
        });
    } catch (error) {
        console.error('❌ Error checking updates:', error);
        res.status(500).json({ message: 'Error checking updates' });
    }
});

module.exports = router;
