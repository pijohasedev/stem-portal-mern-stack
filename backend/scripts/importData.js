// backend/scripts/importData.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 1. Import Model yang baru kita cipta
const State = require('../models/state.model');
const PPD = require('../models/ppd.model');

// --- Konfigurasi ---
// Baca fail .env anda untuk mendapatkan MONGODB_URI
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const NEGERI_CSV_PATH = path.join(__dirname, 'negeri.csv');
const PPD_CSV_PATH = path.join(__dirname, 'ppd.csv');
// --------------------

// Fungsi untuk membaca CSV dan menukarnya kepada array of objects
function parseCSV(filePath) {
    const csvData = fs.readFileSync(filePath, 'utf8');
    const lines = csvData.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim());

    const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        let obj = {};
        header.forEach((key, index) => {
            obj[key] = values[index];
        });
        return obj;
    });
    return data;
}

// Fungsi utama untuk import data
const importData = async () => {
    try {
        // Sambung ke DB
        await mongoose.connect(MONGODB_URI);
        console.log('🔌 Berjaya disambung ke MongoDB...');

        // === 1. Import Negeri ===
        console.log(`\n--- Membaca fail ${NEGERI_CSV_PATH}... ---`);
        const negeriData = parseCSV(NEGERI_CSV_PATH);

        // Padam data lama (pilihan, tapi bagus untuk elak duplikasi)
        await State.deleteMany({});

        // Masukkan data baru
        const states = await State.insertMany(negeriData);
        console.log(`✅ Berjaya import ${states.length} Negeri.`);

        // === 2. Import PPD ===
        console.log(`\n--- Membaca fail ${PPD_CSV_PATH}... ---`);
        const ppdData = parseCSV(PPD_CSV_PATH);

        // Padam data lama
        await PPD.deleteMany({});

        // Cipta satu 'map' untuk padanan mudah Kod Negeri -> ID Negeri
        // Cth: { JHR: '60c7..._id_johor', MLK: '60c7..._id_melaka' }
        const stateMap = {};
        states.forEach(state => {
            stateMap[state.code] = state._id;
        });

        // Padankan PPD dengan ID Negeri
        const ppdToInsert = ppdData.map(ppd => {
            const stateId = stateMap[ppd.state_code];
            if (!stateId) {
                console.warn(`⚠️ AMARAN: Kod Negeri '${ppd.state_code}' untuk PPD '${ppd.name}' tidak ditemui.`);
                return null;
            }
            return {
                name: ppd.name,
                state: stateId // Guna ObjectId Negeri
            };
        }).filter(Boolean); // Buang mana-mana PPD yang 'null' (tidak padan)

        // Masukkan data PPD
        const ppds = await PPD.insertMany(ppdToInsert);
        console.log(`✅ Berjaya import ${ppds.length} PPD.`);

    } catch (error) {
        console.error('\n❌ Ralat semasa import data:', error);
    } finally {
        // Tutup sambungan
        await mongoose.disconnect();
        console.log('\n🚪 Sambungan MongoDB ditutup.');
    }
};

// Jalankan fungsi import
importData();