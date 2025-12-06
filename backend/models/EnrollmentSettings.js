const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const enrollmentSettingsSchema = new Schema({
    year: { type: Number, required: true, unique: true }, // Tetapan ikut tahun (cth: 2025)

    // Fasa 1: Semakan PPD
    verifyStartDate: { type: Date },
    verifyEndDate: { type: Date },

    // Fasa 2: Pengesahan JPN
    approveStartDate: { type: Date },
    approveEndDate: { type: Date },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('EnrollmentSettings', enrollmentSettingsSchema);