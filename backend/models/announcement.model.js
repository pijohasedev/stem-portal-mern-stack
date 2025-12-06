const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const announcementSchema = new Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },

    // Siapa yang boleh baca? (Cth: ['PPD', 'JPN'] atau ['All'])
    targetRoles: [{ type: String, required: true }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Senarai ID pengguna yang sudah klik/baca notifikasi ini
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    priority: { type: String, enum: ['Low', 'Normal', 'High'], default: 'Normal' }

}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);