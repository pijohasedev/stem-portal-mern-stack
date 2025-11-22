const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const initiativeSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: { type: String }, // (Medan tambahan untuk penerangan)
    strategy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Strategy',
        required: true
    },
    // ✅ (Kekal dari kod anda)
    policy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Policy'
    },

    // --- Bahagian Tugasan (Assignment) ---
    // (Kekal dari kod anda - untuk tugasan individu)
    assignees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // ✅ TAMBAHAN BARU: Untuk tugasan berkumpulan
    assignedRole: {
        type: String,
        enum: ['PPD', 'Negeri', 'Bahagian', null], // Tugasan ke semua PPD, Negeri, dll.
        default: null
    },
    assignedState: { // Tugasan ke semua PPD di bawah 1 Negeri
        type: Schema.Types.ObjectId,
        ref: 'State',
        default: null
    },
    assignedPPD: { // Tugasan ke 1 PPD spesifik
        type: Schema.Types.ObjectId,
        ref: 'PPD',
        default: null
    },
    // --- Tamat Bahagian Tugasan ---

    kpi: { // (Struktur KPI dari kod anda dikekalkan)
        target: { type: Number, required: true },
        currentValue: { type: Number, default: 0 },
        unit: { type: String, required: true, default: '%' }
    },
    status: { // (Enum dan Default dari kod anda dikekalkan)
        type: String,
        required: true,
        enum: ['Pending Acceptance', 'Planning', 'Active', 'Completed', 'At Risk'],
        default: 'Pending Acceptance'
    },
    startDate: { type: Date }, // (Kekal dari kod anda)
    endDate: { type: Date },   // (Kekal dari kod anda)
    lastReportDate: { type: Date } // (Baik untuk ada bagi 'reporting')
}, {
    timestamps: true
});

const Initiative = mongoose.model('Initiative', initiativeSchema);

module.exports = Initiative;