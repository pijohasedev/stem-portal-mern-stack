// In backend/middleware/adminAuth.js
module.exports = function (req, res, next) {
    // This middleware should run AFTER the standard 'auth' middleware
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
};