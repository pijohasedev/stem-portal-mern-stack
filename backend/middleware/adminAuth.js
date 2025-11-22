// backend/middleware/adminAuth.js

module.exports = function (req, res, next) {
    // req.user kini datang dari middleware 'auth.js' yang telah kita kemas kini
    // (ia mengambil data terkini dari DB)

    // ✅ PEMBETULAN DI SINI:
    // Tukar semakan daripada 'admin' (lama) kepada 'Admin' (baharu)
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied. Not an admin.' });
    }

    next();
};