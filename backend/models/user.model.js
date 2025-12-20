// backend/models/user.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    lastLogin: { type: Date, default: null },
    lastIp: { type: String, default: '' },

    mustChangePassword: {
        type: Boolean,
        default: true // Default TRUE supaya user baru automatik kena tukar password
    },

    role: {
        type: String,
        enum: ['Admin', 'Bahagian', 'Negeri', 'PPD', 'User'],
        default: 'User'
    },

    // Ini sedia ada, kita kekalkan sebagai String
    department: { type: String },

    // ✅ PERUBAHAN UTAMA DI SINI
    // Daripada String, kita guna rujukan (ref)
    state: {
        type: Schema.Types.ObjectId,
        ref: 'State',
        default: null
    },
    ppd: {
        type: Schema.Types.ObjectId,
        ref: 'PPD',
        default: null
    },
    // --------------------------

    status: {
        type: String,
        enum: ['Active', 'Suspended'],
        default: 'Active'
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);
module.exports = User;