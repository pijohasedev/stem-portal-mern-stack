// backend/models/ppd.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ppdSchema = new Schema({
    name: {
        type: String,
        required: true // Cth: 'PPD Batu Pahat'
    },
    state: {
        type: Schema.Types.ObjectId,
        ref: 'State', // Ini adalah pautan ke state.model.js
        required: true
    }
}, { timestamps: true });

// Ini memastikan nama PPD adalah unik dalam satu negeri
ppdSchema.index({ name: 1, state: 1 }, { unique: true });

const PPD = mongoose.model('PPD', ppdSchema);
module.exports = PPD;