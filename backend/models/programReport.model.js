// backend/models/programReport.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const programReportSchema = new Schema({
    // ... field lain kekal ...
    organizerLevel: { type: String, required: true },
    organizerName: { type: String, required: true },

    teras: { type: Schema.Types.ObjectId, ref: 'Teras' },
    strategy: { type: Schema.Types.ObjectId, ref: 'Strategy' },

    title: { type: String, required: true },
    dateStart: { type: Date, required: true },

    // ✅ UBAH DARI STRING KE OBJECTID (REF)
    createdByState: { type: Schema.Types.ObjectId, ref: 'State' },
    createdByPPD: { type: Schema.Types.ObjectId, ref: 'PPD' },

    dateEnd: { type: Date },
    venue: { type: String },

    targetGroups: [{
        group: { type: String, required: true },
        count: { type: Number, default: 0 }
    }],
    participantCount: { type: Number, default: 0 },
    programLevel: { type: String, default: 'Sekolah' },
    location: {
        lat: { type: Number },
        lng: { type: Number },
        venue: { type: String }
    },
    description: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('ProgramReport', programReportSchema);