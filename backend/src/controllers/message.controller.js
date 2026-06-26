const prisma = require('../utils/db');
const AppError = require('../utils/errors');

exports.sendMessage = async (req, res, next) => {
    try {
        const { content, image, chatId, replyToId } = req.body;

        if ((!content && !image) || !chatId) {
            return next(new AppError('Invalid data passed into request', 400));
        }

        const newMessage = await prisma.message.create({
            data: {
                content: content || null,
                image: image || null,
                senderId: req.user.id,
                chatId,
                replyToId: replyToId || null
            },
            include: {
                sender: { select: { id: true, name: true } },
                chat: { include: { members: true } },
                replyTo: { include: { sender: { select: { id: true, name: true } } } }
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
                sender: { select: { id: true, name: true, email: true } },
                replyTo: { include: { sender: { select: { id: true, name: true } } } }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        next(error);
    }
};
