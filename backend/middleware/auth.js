// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); // 1. Import User Model

// 2. Tukar fungsi ini kepada 'async'
module.exports = async function (req, res, next) {
    // Dapatkan token dari header (logik sedia ada anda)
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Sahkan token
        const decoded = jwt.verify(token, 'your-super-secret-key'); // Pastikan guna secret key anda

        // 3. ✅ PERUBAHAN UTAMA:
        // Ambil data PENGGUNA PENUH dari Pangkalan Data, bukan dari token
        // Ini memastikan kita dapat role terkini ('Admin')
        const user = await User.findById(decoded.user.id).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'User not found, authorization denied' });
        }

        // 4. Lampirkan OBJEK PENGGUNA PENUH pada 'req'
        req.user = user;

        next();
    } catch (e) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};