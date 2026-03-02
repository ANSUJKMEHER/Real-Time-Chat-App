const AppError = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log to console for dev
    console.error(err);

    // Prisma duplicate key error
    if (err.code === 'P2002') {
        const message = `Duplicate field value entered`;
        error = new AppError(message, 400);
    }

    // Prisma record not found
    if (err.code === 'P2025') {
        const message = `Resource not found`;
        error = new AppError(message, 404);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Token is invalid. Please log in again.';
        error = new AppError(message, 401);
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Your token has expired. Please log in again.';
        error = new AppError(message, 401);
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};

module.exports = errorHandler;
