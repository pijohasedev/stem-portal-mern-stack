// backend/scripts/seedPermissions.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Permission = require('../models/permission.model');

dotenv.config({ path: path.join(__dirname, '../.env') });

const defaultPermissions = [
    {
        role: 'Admin',
        allowedPages: ['dashboard', 'users', 'planning', 'initiatives', 'reports', 'report-details']
    },
    {
        role: 'Bahagian',
        allowedPages: ['dashboard', 'reports', 'submit-report', 'report-history', 'report-details', 'initiatives']
    },
    {
        role: 'Negeri',
        allowedPages: ['dashboard', 'reports', 'submit-report', 'report-history', 'report-details', 'initiatives']
    },
    {
        role: 'PPD',
        allowedPages: ['dashboard-owner', 'submit-report', 'report-history', 'report-details', 'initiatives-list']
    },
    {
        role: 'User',
        allowedPages: ['dashboard-owner', 'submit-report', 'report-history', 'report-details', 'initiatives-list']
    }
];

const seedPermissions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🔌 Connected to MongoDB...');

        await Permission.deleteMany({}); // Bersihkan data lama
        console.log('🧹 Cleared existing permissions.');

        await Permission.insertMany(defaultPermissions);
        console.log('✅ Default permissions seeded successfully!');

    } catch (error) {
        console.error('❌ Error seeding permissions:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🚪 Disconnected.');
    }
};

seedPermissions();