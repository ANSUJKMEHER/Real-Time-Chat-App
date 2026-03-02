const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Connect DB (Prisma is automatically connected upon query, but we can verify)

// Import middleware & routes
const errorHandler = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const messageRoutes = require('./routes/message.routes');
const userRoutes = require('./routes/user.routes');
const requestRoutes = require('./routes/request.routes');

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// Error Middleware
app.use(errorHandler);

const server = http.createServer(app);

const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Setup socket io logic
require('./socket')(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
