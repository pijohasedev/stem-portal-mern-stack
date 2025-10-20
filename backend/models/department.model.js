const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Pastikan tiada nama department yang sama
        trim: true
    }
}, { timestamps: true });

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;