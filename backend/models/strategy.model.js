const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const strategySchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    teras: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teras',
        required: true
    }
}, {
    timestamps: true
});

const Strategy = mongoose.model('Strategy', strategySchema);

module.exports = Strategy;