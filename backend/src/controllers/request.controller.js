const prisma = require('../utils/db');
const AppError = require('../utils/errors');

// Send a friend request
exports.sendRequest = async (req, res, next) => {
    try {
        const { receiverId } = req.body;

        if (!receiverId) {
            return next(new AppError('ReceiverId is required', 400));
        }

        if (receiverId === req.user.id) {
            return next(new AppError('You cannot send a request to yourself', 400));
        }

        // Check if request already exists
        const existingRequest = await prisma.chatRequest.findFirst({
            where: {
                OR: [
                    { senderId: req.user.id, receiverId },
                    { senderId: receiverId, receiverId: req.user.id }
                ]
            }
        });

        if (existingRequest) {
            return next(new AppError('Request already sent or received between these users', 400));
        }

        // Check if chat already exists
        const existingChat = await prisma.chat.findFirst({
            where: {
                isGroup: false,
                AND: [
                    { members: { some: { userId: req.user.id } } },
                    { members: { some: { userId: receiverId } } }
                ]
            }
        });

        if (existingChat) {
            return next(new AppError('You are already connected with this user', 400));
        }

        const request = await prisma.chatRequest.create({
            data: {
                senderId: req.user.id,
                receiverId
            },
            include: {
                sender: { select: { id: true, name: true, profilePic: true } }
            }
        });

        res.status(201).json({ success: true, data: request });
    } catch (error) {
        if (error.code === 'P2002') {
            return next(new AppError('Request already sent', 400));
        }
        next(error);
    }
};

// Get all pending requests for the logged-in user
exports.getPendingRequests = async (req, res, next) => {
    try {
        const requests = await prisma.chatRequest.findMany({
            where: {
                receiverId: req.user.id,
                status: 'PENDING'
            },
            include: {
                sender: { select: { id: true, name: true, profilePic: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        next(error);
    }
};

// Accept or Reject request
exports.respondToRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'ACCEPTED' or 'REJECTED'

        if (!['ACCEPTED', 'REJECTED'].includes(status)) {
            return next(new AppError('Invalid status', 400));
        }

        const request = await prisma.chatRequest.findUnique({
            where: { id }
        });

        if (!request) {
            return next(new AppError('Request not found', 404));
        }

        if (request.receiverId !== req.user.id) {
            return next(new AppError('Not authorized', 403));
        }

        if (request.status !== 'PENDING') {
            return next(new AppError('Request already responded to', 400));
        }

        const updatedRequest = await prisma.chatRequest.update({
            where: { id },
            data: { status }
        });

        if (status === 'ACCEPTED') {
            // Create chat internally
            await prisma.chat.create({
                data: {
                    isGroup: false,
                    members: {
                        create: [
                            { userId: request.senderId },
                            { userId: request.receiverId }
                        ]
                    }
                }
            });

            // Notify the sender so their sidebar updates in real-time
            const io = req.app.get('io');
            if (io) {
                // In our setup, a user joins a room with their userId
                io.to(request.senderId).emit('fetch_chats');
            }
        }

        res.status(200).json({ success: true, data: updatedRequest });
    } catch (error) {
        next(error);
    }
};
