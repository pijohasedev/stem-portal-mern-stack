const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const policySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    }
}, {
    timestamps: true // Automatically adds 'createdAt' and 'updatedAt' fields
});

const Policy = mongoose.model('Policy', policySchema);

module.exports = Policy;