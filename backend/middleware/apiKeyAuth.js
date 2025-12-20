// middleware/apiKeyAuth.js
const apiKeyAuth = (req, res, next) => {
    // n8n perlu hantar header: 'x-api-key'
    const apiKey = req.headers['x-api-key'];
    const validKey = process.env.N8N_API_KEY;

    if (!apiKey || apiKey !== validKey) {
        return res.status(401).json({ message: 'Akses Ditolak: Invalid API Key' });
    }

    next();
};

module.exports = apiKeyAuth;