# Real-Time Chat Application

A production-ready full-stack real-time chat application built with Node.js, Express, PostgreSQL, Prisma, React, and Socket.io.

## Project Structure

```text
/chatting
├── backend/            # Express, Socket.io, Prisma (PostgreSQL)
│   ├── prisma/         # Database schema and migrations
│   ├── src/            # Application source code
│   │   ├── controllers/# Business logic
│   │   ├── middleware/ # Express middlewares (Auth, Errors)
│   │   ├── routes/     # API routes
│   │   ├── services/   # Prisma DB operations
│   │   ├── socket/     # Socket.io events and logic
│   │   ├── utils/      # Helpers (db instance, error classes)
│   │   └── server.js   # Application entry point
│   ├── .env
│   └── package.json
└── frontend/           # React (Vite)
    ├── src/            # React source code
    │   ├── context/    # Global Context (Auth)
    │   ├── pages/      # Login, Register, Dashboard
    │   ├── services/   # Axios and Socket abstractions
    │   ├── App.jsx     # Main Router
    │   └── index.css   # Global Styling
    └── package.json
```

## Architecture Decisions

### Backend
- **MVC Pattern**: Separated routes, controllers, and services (via Prisma singleton).
- **Prisma & PostgreSQL**: Used a relational database with Prisma for type-safe queries, fast migrations, and robust connections. Foreign keys ensure cascading deletes for clean teardown.
- **Centralized Error Handling**: Custom `AppError` class and middleware to catch async errors, Prisma errors (like P2002 for unique constraint violations), and JWT verification errors preventing API layer crashes.
- **JWT & bcrypt**: Used for stateless authentication. Passwords are salted and hashed natively inside the auth controller before DB storage.
- **Socket.io module**: Employs its own authentication layer validating JWT before allowing connections. Used `Maps` locally to track online users efficiently. Keeps HTTP distinct from WebSocket routes for clarity.

### Frontend
- **React Router**: For client-side routing, augmented with a custom `PrivateRoute` wrapper.
- **Context API (`AuthContext`)**: Orchestrates the user's logged-in state, JWT caching (localStorage), and manages the socket connection lifecycle (connecting on login/mount, disconnecting on logout).
- **Axios Interceptors**: Automatically injects the JWT token inside every API call header, eliminating repetitive boilerplate.
- **Vite**: Replaced CRA for vastly faster hot-module reloading and optimized builds.
- **Vanilla CSS + Lucide React**: Chosen over UI frameworks to have absolute pixel-control and keep bundle sizes diminutive, supplemented by modern SVG icons.

## Database Design

The schema is heavily normalized:
- **`User`**: Tracks `email`, `password`, `name`, `role`.
- **`Chat`**: A universal chat object distinguishing between one-on-one and groups via `isGroup`. Let us attach `name` for groups.
- **`ChatMember`**: A many-to-many join table bridging `User` and `Chat`.
- **`Message`**: Tied directly to a `Chat` and `User` (sender).
- **Optimizations**: Indexed by `createdAt` in messages for fast offset/cursor pagination, and a composite unique key `[userId, chatId]` on members prevents accidental duplicate additions.

## How Real-Time Works

1. **Connection**: Client establishes steady WS connection appending JWT inside `auth.token`. 
2. **Identification**: Server adds socket to `onlineUsers` map and broadcasting `online_users` event.
3. **Rooms**: Inside `socket/index.js`, clients explicitly join chat room IDs.
4. **Broadcasting**: Upon sending a message (HTTP POST), the client emits `new_message` over socket. The server relays this solely to members of that chat (`in(userId).emit`).
5. **Typing Indicators**: `typing` and `stop_typing` events are throttled locally on React via `setTimeout` and broadcast to specific rooms only.

## Setup Instructions

### 1. Database Setup
Ensure PostgreSQL is running on your machine.
Create a database named `chatdb`.

### 2. Backend Setup
```bash
cd backend
npm install
# Update .env inside backend folder with your DB credentials if different
npx prisma db push # OR: npx prisma migrate dev --name init
npx prisma generate
npm run dev
```
*Backend runs on `http://localhost:5000`*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*
