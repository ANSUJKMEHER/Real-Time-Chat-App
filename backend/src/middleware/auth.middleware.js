const jwt = require('jsonwebtoken');
const AppError = require('../utils/errors');
const prisma = require('../utils/db');

exports.protect = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('Not authorized to access this route', 401));
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, name: true, email: true, role: true }
            });

            if (!user) {
                return next(new AppError('The user belonging to this token does no longer exist', 401));
            }

            req.user = user;
            next();
        } catch (err) {
            return next(new AppError('Not authorized to access this route', 401));
        }
    } catch (error) {
        next(error);
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(`User role ${req.user.role} is not authorized to access this route`, 403)
            );
        }
        next();
    };
};
