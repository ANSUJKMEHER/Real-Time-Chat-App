const prisma = require('../utils/db');
const AppError = require('../utils/errors');

exports.allUsers = async (req, res, next) => {
    try {
        const search = req.query.search || '';

        const keyword = search
            ? {
                OR: [
                    { name: { contains: search } },
                    { email: { contains: search } },
                    { username: { contains: search } },
                ],
            }
            : {};

        const users = await prisma.user.findMany({
            where: {
                ...keyword,
                id: { not: req.user.id }
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                profilePic: true
            }
        });

        res.status(200).json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const { profilePic } = req.body;

        if (!profilePic) {
            return next(new AppError('Profile picture URL is required', 400));
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { profilePic },
            select: { id: true, name: true, username: true, email: true, profilePic: true, role: true }
        });

        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        next(error);
    }
};
