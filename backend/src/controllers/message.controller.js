const prisma = require('../utils/db');
const AppError = require('../utils/errors');

exports.sendMessage = async (req, res, next) => {
    try {
        const { content, chatId } = req.body;

        if (!content || !chatId) {
            return next(new AppError('Invalid data passed into request', 400));
        }

        const newMessage = await prisma.message.create({
            data: {
                content,
                senderId: req.user.id,
                chatId
            },
            include: {
                sender: { select: { id: true, name: true } },
                chat: true
            }
        });

        res.status(200).json({ success: true, data: newMessage });
    } catch (error) {
        next(error);
    }
};

exports.allMessages = async (req, res, next) => {
    try {
        const { chatId } = req.params;

        const messages = await prisma.message.findMany({
            where: { chatId },
            include: {
                sender: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        next(error);
    }
};
