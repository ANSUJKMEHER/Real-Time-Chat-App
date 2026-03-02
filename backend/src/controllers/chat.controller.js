const prisma = require('../utils/db');
const AppError = require('../utils/errors');

// 1-on-1 Chat or get existing
exports.accessChat = async (req, res, next) => {
    try {
        const { userId } = req.body; // who to chat with

        if (!userId) {
            return next(new AppError('UserId param not sent with request', 400));
        }

        // Check if 1-on-1 chat exists
        let chat = await prisma.chat.findFirst({
            where: {
                isGroup: false,
                AND: [
                    { members: { some: { userId: req.user.id } } },
                    { members: { some: { userId: userId } } },
                ]
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (chat) {
            return res.status(200).json({ success: true, data: chat });
        }

        // Create a new chat
        const newChat = await prisma.chat.create({
            data: {
                isGroup: false,
                members: {
                    create: [
                        { userId: req.user.id },
                        { userId: userId }
                    ]
                }
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                }
            }
        });

        res.status(200).json({ success: true, data: newChat });
    } catch (error) {
        next(error);
    }
};

// Get all chats for a user
exports.fetchChats = async (req, res, next) => {
    try {
        const chats = await prisma.chat.findMany({
            where: {
                members: {
                    some: { userId: req.user.id }
                }
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, data: chats });
    } catch (error) {
        next(error);
    }
};

// Create a Group Chat
exports.createGroupChat = async (req, res, next) => {
    try {
        if (!req.body.users || !req.body.name) {
            return next(new AppError('Please fill all the fields', 400));
        }

        const currentUserId = req.user.id;
        let users = JSON.parse(req.body.users);

        if (users.length < 2) {
            return next(new AppError('More than 2 users are required to form a group chat', 400));
        }

        const groupChat = await prisma.chat.create({
            data: {
                name: req.body.name,
                isGroup: true,
                members: {
                    create: [
                        ...users.map(id => ({ userId: id })),
                        { userId: currentUserId }
                    ]
                }
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                }
            }
        });

        res.status(200).json({ success: true, data: groupChat });
    } catch (error) {
        next(error);
    }
};
