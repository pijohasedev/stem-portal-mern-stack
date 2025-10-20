const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const terasSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    policy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Policy',
        required: true
    }
}, {
    timestamps: true
});

const Teras = mongoose.model('Teras', terasSchema);

module.exports = Teras;