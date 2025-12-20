// models/ActivityLog.js
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: { type: String, required: true }, // CONTOH: 'LOGIN', 'CREATE_USER', 'APPROVE_DATA'
    description: { type: String }, // Detail: "User Ali updated School SMK Bunga"
    ip: { type: String },
    userAgent: { type: String }, // Browser info
}, { timestamps: true });

activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3888000 }); // Log akan auto padam selepas 45 hari (45*24*60*60 = 3888000 saat)

module.exports = mongoose.model('ActivityLog', activityLogSchema);