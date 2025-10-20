const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const initiativeSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    strategy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Strategy',
        required: true
    },
    // ✅ ADD THIS - Direct reference to policy for easier queries
    policy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Policy'

    },
    assignees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    kpi: {
        target: { type: Number, required: true },
        currentValue: { type: Number, default: 0 },
        unit: { type: String, required: true, default: '%' }
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending Acceptance', 'Planning', 'Active', 'Completed', 'At Risk'],
        default: 'Pending Acceptance' // <-- THIS LINE IS THE FIX
    },
    startDate: { type: Date },
    endDate: { type: Date }
}, {
    timestamps: true
});

const Initiative = mongoose.model('Initiative', initiativeSchema);

module.exports = Initiative;