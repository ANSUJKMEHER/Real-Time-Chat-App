const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');
const AppError = require('../utils/errors');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d',
    });
};

exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return next(new AppError('Please provide name, email and password', 400));
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profilePic: true
            }
        });

        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            token,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new AppError('Please provide an email and password', 400));
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return next(new AppError('Invalid credentials', 401));
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return next(new AppError('Invalid credentials', 401));
        }

        const token = generateToken(user.id);

        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profilePic: user.profilePic
        };

        res.status(200).json({
            success: true,
            token,
            data: safeUser
        });
    } catch (error) {
        next(error);
    }
};

exports.getMe = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, profilePic: true }
        });

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};
