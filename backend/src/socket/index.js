const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');

module.exports = (io) => {

    // Middleware to authenticate socket connection
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await prisma.user.findUnique({ where: { id: decoded.id } });
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    const onlineUsers = new Map();

    io.on('connection', (socket) => {
        console.log(`User connected socket_id: ${socket.id}, user_id: ${socket.user.id}`);

        // Add to online users
        onlineUsers.set(socket.user.id, socket.id);
        io.emit('online_users', Array.from(onlineUsers.keys()));

        socket.on('setup', (userData) => {
            socket.join(userData.id);
            socket.emit('connected');
        });

        socket.on('join_chat', (room) => {
            socket.join(room);
            console.log(`User ${socket.user.id} joined room: ${room}`);
        });

        socket.on('typing', (room) => socket.in(room).emit('typing'));
        socket.on('stop_typing', (room) => socket.in(room).emit('stop_typing'));

        socket.on('new_message', (newMessageReceived) => {
            let chat = newMessageReceived.chat;

            if (!chat.members) return console.log('chat.members not defined');

            chat.members.forEach((member) => {
                if (member.userId === newMessageReceived.senderId) return; // Don't send back to sender

                socket.in(member.userId).emit('message_received', newMessageReceived);
            });
        });

        // --- WebRTC Signaling Events ---
        
        // Initiate a call
        socket.on('call_user', ({ userToCall, signalData, from, name, callType }) => {
            socket.in(userToCall).emit('call_user', { signal: signalData, from, name, callType });
        });

        // Answer a call
        socket.on('answer_call', ({ to, signal }) => {
            socket.in(to).emit('call_accepted', signal);
        });

        // Reject a call
        socket.on('reject_call', ({ to }) => {
            socket.in(to).emit('call_rejected');
        });

        // Exchange ICE candidates
        socket.on('ice_candidate', ({ to, candidate }) => {
            socket.in(to).emit('ice_candidate', candidate);
        });

        // End a call
        socket.on('end_call', ({ to }) => {
            socket.in(to).emit('call_ended');
        });

        socket.on('disconnect', () => {
            console.log('USER DISCONNECTED:', socket.user.id);
            onlineUsers.delete(socket.user.id);
            io.emit('online_users', Array.from(onlineUsers.keys()));
            socket.leave(socket.user.id);
        });
    });
};
