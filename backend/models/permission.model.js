// backend/models/permission.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const permissionSchema = new Schema({
    role: {
        type: String,
        required: true,
        unique: true,
        enum: ['Admin', 'Bahagian', 'Negeri', 'PPD', 'User']
    },
    allowedPages: {
        type: [String],
        default: [] // PENTING: elakkan undefined
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Permission', permissionSchema);
