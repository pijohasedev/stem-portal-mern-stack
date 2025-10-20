// backend/models/report.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
    // Link to the Initiative this report is for
    initiative: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Initiative',
        required: true
    },
    // Link to the User who submitted the report
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Auto-set report date
    reportDate: {
        type: Date,
        default: Date.now
    },
    period: { type: String, required: true },
    summary: { type: String, required: true },
    challenges: { type: String },
    nextSteps: { type: String },

    // Optional (legacy fields – keep for backward compatibility)
    //participants: { type: Number, default: 0 },
    //attendanceRate: { type: Number, default: 0, min: 0, max: 100 },
    //completionRate: { type: Number, default: 0, min: 0, max: 100 },


    feedback: { // ✅ Field baru
        type: String,
        default: '',
    },

    // Status for admin review
    status: {
        type: String,
        enum: ['Pending Review', 'Approved', 'Needs Revision'],
        default: 'Pending Review'
    }

}, {
    timestamps: true,
});

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
