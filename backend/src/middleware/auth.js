const jwt = require('jsonwebtoken');
const config = require('../config');

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required',
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
        });
    }
}

// Optional auth - attaches user if token present, but doesn't fail if not
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (token) {
        try {
            req.user = jwt.verify(token, config.jwt.secret);
        } catch (_) {
            // ignore
        }
    }
    next();
}

module.exports = { verifyToken, optionalAuth };
