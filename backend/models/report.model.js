// backend/models/report.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
    initiative: { type: mongoose.Schema.Types.ObjectId, ref: 'Initiative', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportDate: { type: Date, default: Date.now },
    period: { type: String, required: true },
    summary: { type: String, required: true },
    challenges: { type: String },
    nextSteps: { type: String },

    kpiSnapshot: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 100 },
    feedback: { type: String, default: '' },
    status: {
        type: String,
        enum: ['Pending Review', 'Approved', 'Needs Revision'],
        default: 'Pending Review'
    },

    // ✅ TAMBAHAN BARU: Snapshot Lokasi Pemilik
    submittedTier: { type: String }, // cth: 'PPD'
    submittedDepartment: { type: String }, // cth: 'BSH'
    submittedState: { type: String }, // cth: 'Johor'
    submittedPPD: { type: String },   // cth: 'PPD Pasir Gudang'

    // Sejarah (kekal sama)
    history: [{
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now },
        previousData: {
            summary: String,
            challenges: String,
            nextSteps: String,
            period: String,
            completionRate: Number,
            kpiSnapshot: Number
        }
    }]

}, {
    timestamps: true,
});

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;