const express = require('express');
const router = express.Router();
const Announcement = require('../models/announcement.model');
const auth = require('../middleware/auth');

// 1. ADMIN: CIPTA PENGUMUMAN
router.post('/', auth, async (req, res) => {
    try {
        // Hanya admin boleh post (boleh tambah check role di sini jika perlu)
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Akses dinafikan." });
        }

        const { title, message, targetRoles, priority } = req.body;

        const newAnnouncement = new Announcement({
            title,
            message,
            targetRoles, // Array string, cth: ['PPD', 'JPN']
            priority: priority || 'Normal',
            createdBy: req.user.id
        });

        await newAnnouncement.save();
        res.json(newAnnouncement);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mencipta pengumuman." });
    }
});

// 2. ADMIN: DAPATKAN SEMUA SEJARAH PENGUMUMAN
router.get('/all', auth, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') return res.status(403).json({ message: "Akses dinafikan." });

        const list = await Announcement.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'firstName lastName');

        res.json(list);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

// 3. USER: DAPATKAN NOTIFIKASI SAYA (NAVBAR)
router.get('/my', auth, async (req, res) => {
    try {
        const userRole = req.user.role; // Cth: 'PPD'

        // Cari pengumuman yang:
        // 1. targetRoles mengandungi role user ini ATAU 'All'
        const notifications = await Announcement.find({
            targetRoles: { $in: [userRole, 'All', 'all'] }
        }).sort({ createdAt: -1 }).limit(10); // Ambil 10 terkini

        // Kira berapa yang belum dibaca
        // (Yang ID user TIADA dalam array readBy)
        const unreadCount = notifications.filter(
            n => !n.readBy.includes(req.user.id)
        ).length;

        res.json({ notifications, unreadCount });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mendapatkan notifikasi." });
    }
});

// 4. USER: TANDA SEBAGAI DIBACA (MARK AS READ)
router.put('/:id/read', auth, async (req, res) => {
    try {
        await Announcement.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { readBy: req.user.id } } // $addToSet elak duplikasi ID
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Error updating read status" });
    }
});

// 5. USER: TANDA SEMUA SEBAGAI DIBACA
router.put('/read-all', auth, async (req, res) => {
    try {
        const userRole = req.user.role;

        // Cari semua yg relevant
        const relevantDocs = await Announcement.find({
            targetRoles: { $in: [userRole, 'All', 'all'] }
        });

        // Update satu persatu (atau guna updateMany jika query complex)
        const updates = relevantDocs.map(doc => {
            return Announcement.findByIdAndUpdate(doc._id, {
                $addToSet: { readBy: req.user.id }
            });
        });

        await Promise.all(updates);
        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ message: "Error marking all as read" });
    }
});

// 6. ADMIN: KEMASKINI PENGUMUMAN (EDIT)
router.put('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') return res.status(403).json({ message: "Akses dinafikan." });

        const { title, message, targetRoles, priority } = req.body;

        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
            req.params.id,
            { title, message, targetRoles, priority },
            { new: true } // Return data yang baru
        );

        if (!updatedAnnouncement) return res.status(404).json({ message: "Pengumuman tidak dijumpai." });

        res.json(updatedAnnouncement);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengemaskini pengumuman." });
    }
});

// 7. ADMIN: PADAM PENGUMUMAN (DELETE)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') return res.status(403).json({ message: "Akses dinafikan." });

        const result = await Announcement.findByIdAndDelete(req.params.id);

        if (!result) return res.status(404).json({ message: "Pengumuman tidak dijumpai." });

        res.json({ message: "Pengumuman berjaya dipadam." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal memadam pengumuman." });
    }
});

module.exports = router;