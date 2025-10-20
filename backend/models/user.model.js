// In backend/models/user.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,    // No two users can have the same email
        trim: true,
        lowercase: true, // Store all emails in lowercase
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
        enum: ['owner', 'admin', 'viewer'],
        default: 'owner'
    },

    status: {
        type: String,
        enum: ['Active', 'Suspended'],
        default: 'Active'
    },
    department: { type: String }

}, {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User;