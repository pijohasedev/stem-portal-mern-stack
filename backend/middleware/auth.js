// In backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-super-secret-key'; // Use the same secret as in your login route

module.exports = function (req, res, next) {
    // 1. Get the token from the request header
    const token = req.header('Authorization');

    // 2. Check if no token is present
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // 3. Verify the token
    try {
        // The token is in the format "Bearer <token>", so we split and take the second part
        const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);

        // Add the user payload from the token to the request object
        req.user = decoded.user;
        next(); // Move on to the next function (the route handler)
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};