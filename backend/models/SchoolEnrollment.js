const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Sub-schema untuk data statistik (digunakan untuk System Data & Verified Data)
const EnrollmentStatsSchema = new Schema({
    // 1. Pakej STEM (A, B, C1, C2)
    stemA: { type: Number, default: 0 },
    stemB: { type: Number, default: 0 },
    stemC1: { type: Number, default: 0 },
    stemC2: { type: Number, default: 0 },

    // 2. Kategori Lain (E, F)
    categoryE: { type: Number, default: 0 }, // Kemanusiaan & Sastera
    categoryF: { type: Number, default: 0 }, // Vokasional (MPV/PAV)

    // 3. Bukan STEM & Jumlah
    nonStem: { type: Number, default: 0 },   // "Bukan STEM" (Aliran Sastera tulen dll)
    totalStudents: { type: Number, default: 0 }, // Jumlah Keseluruhan Murid

    // 4. Kiraan Automatik
    totalSTEM: { type: Number, default: 0 }, // A + B + C1 + C2
    stemPercentage: { type: Number, default: 0 } // (Total STEM / Total Students) * 100
}, { _id: false });

const schoolEnrollmentSchema = new Schema({
    // --- Maklumat Konteks Masa (Requirement 1) ---
    year: { type: Number, required: true, index: true }, // Cth: 2024
    month: { type: Number, required: true, index: true }, // 1-12 (Cth: 10 untuk Oktober)

    // --- Maklumat Lokasi & Sekolah (Requirement 2) ---
    state: { type: mongoose.Schema.Types.ObjectId, ref: 'State', required: true },
    ppd: { type: mongoose.Schema.Types.ObjectId, ref: 'PPD', required: true, index: true },
    schoolType: { type: String, required: true }, // Cth: 'SMK', 'SABK', 'KV'
    schoolCode: { type: String, required: true, index: true },
    schoolName: { type: String, required: true },

    // --- Data Enrolmen ---
    // Data asal dari upload Excel admin
    systemData: { type: EnrollmentStatsSchema, default: () => ({}) },

    // Data yang disemak oleh PPD (Editable)
    verifiedData: { type: EnrollmentStatsSchema, default: () => ({}) },

    // --- Status Aliran Kerja ---
    status: {
        type: String,
        enum: ['Draft', 'Pending Verification', 'Verified by PPD', 'Approved by JPN'],
        default: 'Pending Verification'
    },

    // Logs
    logs: [{
        action: String,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
    }]

}, { timestamps: true });

// Middleware: Kira Total & Percentage secara automatik sebelum simpan
const calculateStats = (stats) => {
    if (!stats) return;

    // Kira Total STEM (Hanya A, B, C1, C2 dikira sebagai STEM Tulen/Vokasional)
    stats.totalSTEM = (stats.stemA || 0) + (stats.stemB || 0) + (stats.stemC1 || 0) + (stats.stemC2 || 0);

    // Nota: Selalunya Total Students provided by Excel. 
    // Jika tidak, boleh guna: stats.totalSTEM + stats.categoryE + stats.categoryF + stats.nonStem;

    // Kira Peratusan
    if (stats.totalStudents > 0) {
        stats.stemPercentage = (stats.totalSTEM / stats.totalStudents) * 100;
    } else {
        stats.stemPercentage = 0;
    }
};

schoolEnrollmentSchema.pre('save', function (next) {
    calculateStats(this.systemData);
    calculateStats(this.verifiedData);
    next();
});

// Composite index untuk pastikan tiada duplikasi data untuk sekolah sama pada bulan/tahun sama
schoolEnrollmentSchema.index({ schoolCode: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('SchoolEnrollment', schoolEnrollmentSchema);