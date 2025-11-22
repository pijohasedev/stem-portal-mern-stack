// backend/models/state.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const stateSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true  // Cth: 'Johor'
    },
    code: {
        type: String,
        required: true,
        unique: true  // Cth: 'JHR'
    }
}, { timestamps: true });

const State = mongoose.model('State', stateSchema);
module.exports = State;