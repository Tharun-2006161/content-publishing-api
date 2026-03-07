const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    // Sequelize validation errors
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors ? err.errors.map(e => e.message) : [err.message],
        });
    }

    // Joi validation errors
    if (err.isJoi) {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: err.message,
        });
    }

    // Custom app errors
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    logger.error('Unhandled error:', err);

    res.status(500).json({
        success: false,
        message: 'Internal server error',
    });
}

class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}

module.exports = { errorHandler, AppError };
