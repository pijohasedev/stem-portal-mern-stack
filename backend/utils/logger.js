const ActivityLog = require('../models/ActivityLog');

const logActivity = async (userId, action, description, req) => {
    try {
        // Dapatkan IP Address (ambil dari request headers atau socket)
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

        // Bersihkan format IP (kadang-kadang ada ::ffff:)
        if (ip.substr(0, 7) == "::ffff:") {
            ip = ip.substr(7);
        }

        await ActivityLog.create({
            user: userId,
            action: action,
            description: description,
            ip: ip
        });

        console.log(`[LOG] ${action}: ${description}`);
    } catch (err) {
        console.error("Gagal simpan log:", err.message);
        // Kita tak throw error supaya proses utama user tak terganggu
    }
};

module.exports = logActivity;