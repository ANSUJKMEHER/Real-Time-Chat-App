<p align="center">
  <img src="frontend/public/pwa-512x512.png" alt="ChatApp Logo" width="120" height="120" style="border-radius: 24px;" />
</p>

<h1 align="center">💬 Real-Time Chat App</h1>

<p align="center">
  A production-ready, full-stack real-time chat application with <strong>video & voice calling</strong>, <strong>image sharing</strong>, <strong>group chats</strong>, and <strong>PWA support</strong> — built with modern web technologies.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Prisma-5.x-2D3748?style=flat-square&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF?style=flat-square&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/License-ISC-blue?style=flat-square" alt="License" />
</p>

---

## ✨ Features

| Category | Feature | Description |
|----------|---------|-------------|
| 💬 **Messaging** | Real-time Chat | Instant messaging powered by Socket.io WebSockets |
| | Group Chats | Create group conversations with multiple participants |
| | Message Replies | Reply to specific messages with threaded context |
| | Typing Indicators | See when someone is typing in real-time |
| | Emoji Picker | Full emoji support with integrated picker |
| | Date Separators | Messages grouped by day with smart labels (Today, Yesterday, etc.) |
| 📸 **Media** | Image Sharing | Send and receive images via Cloudinary CDN |
| | Image Downloads | Download received images with one click |
| | Profile Pictures | Upload and manage your profile picture |
| 📹 **Calling** | Video Calls | Peer-to-peer video calling via WebRTC |
| | Voice Calls | Audio-only calls for low-bandwidth scenarios |
| | Screen Sharing | Share your screen during video calls (desktop) |
| | Call Controls | Mute, camera toggle, and screen share controls |
| 👥 **Social** | Friend Requests | Send, accept, or decline friend requests |
| | Online Status | See which users are currently online |
| | User Search | Find users by name, email, or @username |
| 🔐 **Auth** | JWT Authentication | Stateless, secure authentication with token-based auth |
| | Password Hashing | bcrypt salted password hashing |
| | Password Reset | Built-in password reset flow |
| 📱 **PWA** | Installable | Install as a native app on mobile and desktop |
| | Push Notifications | Native notifications for incoming calls and messages |
| | Offline Ready | Service worker for offline support |
| 🎨 **UI/UX** | Dark / Light Mode | Toggle between dark and light themes |
| | Responsive Design | Mobile-first design that works on all screen sizes |

---

## 🏗️ Architecture

```
Real-Time-Chat-App/
├── backend/                    # Node.js + Express API Server
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (PostgreSQL)
│   ├── src/
│   │   ├── controllers/        # Business logic layer
│   │   │   ├── auth.controller.js
│   │   │   ├── chat.controller.js
│   │   │   ├── message.controller.js
│   │   │   ├── request.controller.js
│   │   │   └── user.controller.js
│   │   ├── middleware/         # Express middlewares (Auth, Errors)
│   │   ├── routes/            # REST API route definitions
│   │   │   ├── auth.routes.js
│   │   │   ├── chat.routes.js
│   │   │   ├── message.routes.js
│   │   │   ├── request.routes.js
│   │   │   └── user.routes.js
│   │   ├── socket/            # Socket.io event handlers
│   │   │   └── index.js
│   │   ├── utils/             # Helpers (DB instance, error classes)
│   │   └── server.js          # Application entry point
│   ├── .env                   # Environment variables
│   └── package.json
│
├── frontend/                   # React + Vite SPA
│   ├── public/                # Static assets & PWA icons
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── VideoCallModal.jsx
│   │   ├── context/           # React Context (Auth, Theme)
│   │   ├── pages/             # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── services/          # API & Socket abstractions
│   │   │   ├── api.js         # Axios instance with interceptors
│   │   │   └── socket.js      # Socket.io client instance
│   │   ├── App.jsx            # Main Router & Theme Provider
│   │   └── index.css          # Global styling
│   ├── vite.config.js         # Vite + PWA configuration
│   ├── vercel.json            # Vercel deployment config
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🔧 Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express 5** | HTTP server framework |
| **Socket.io 4** | Real-time bidirectional communication |
| **Prisma 5** | Type-safe ORM for PostgreSQL |
| **PostgreSQL** | Relational database |
| **JWT** | Stateless authentication |
| **bcrypt** | Password hashing |
| **CORS** | Cross-origin resource sharing |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI component library |
| **Vite 7** | Build tool & dev server |
| **Socket.io Client** | WebSocket client |
| **Axios** | HTTP client with interceptors |
| **React Router 7** | Client-side routing |
| **Lucide React** | Modern SVG icon library |
| **Emoji Picker React** | Emoji selection component |
| **Cloudinary** | Image upload & CDN |
| **WebRTC** | Peer-to-peer video/audio calls |
| **vite-plugin-pwa** | Progressive Web App support |

---

## 🗄️ Database Schema

```mermaid
erDiagram
    User ||--o{ ChatMember : has
    User ||--o{ Message : sends
    User ||--o{ ChatRequest : "sends (sender)"
    User ||--o{ ChatRequest : "receives (receiver)"
    Chat ||--o{ ChatMember : has
    Chat ||--o{ Message : contains
    Message ||--o{ Message : "replies to"

    User {
        uuid id PK
        string username UK
        string name
        string email UK
        string password
        string profilePic
        string role
        datetime createdAt
    }

    Chat {
        uuid id PK
        boolean isGroup
        string name
        datetime createdAt
    }

    ChatMember {
        uuid id PK
        uuid userId FK
        uuid chatId FK
    }

    Message {
        uuid id PK
        string content
        string image
        uuid senderId FK
        uuid chatId FK
        uuid replyToId FK
        datetime createdAt
    }

    ChatRequest {
        uuid id PK
        uuid senderId FK
        uuid receiverId FK
        string status
        datetime createdAt
    }
```

**Key Design Decisions:**
- **Composite unique keys** on `ChatMember(userId, chatId)` and `ChatRequest(senderId, receiverId)` prevent duplicate entries
- **`createdAt` index** on `Message` enables fast pagination queries
- **Cascading deletes** on all foreign keys ensure clean data teardown
- **Self-referential relation** on `Message.replyToId` with `onDelete: SetNull` preserves threads when original messages are deleted

---

## ⚡ How Real-Time Works

```mermaid
sequenceDiagram
    participant Client A
    participant Server
    participant Client B

    Note over Client A, Server: 1. Connection
    Client A->>Server: WebSocket connect (JWT in auth.token)
    Server->>Server: Validate JWT & add to onlineUsers map
    Server-->>Client A: online_users broadcast

    Note over Client A, Client B: 2. Messaging
    Client A->>Server: HTTP POST /api/messages
    Server->>Server: Save to PostgreSQL
    Client A->>Server: emit("new_message")
    Server->>Client B: emit("message_received") [room-scoped]

    Note over Client A, Client B: 3. Typing
    Client A->>Server: emit("typing", chatId)
    Server->>Client B: emit("typing") [room-scoped]
    Client A->>Server: emit("stop_typing", chatId) [3s debounce]

    Note over Client A, Client B: 4. Video Call (WebRTC)
    Client A->>Server: emit("call_user", {offer, to})
    Server->>Client B: emit("call_user", {offer, from})
    Client B->>Server: emit("answer_call", {answer, to})
    Server->>Client A: emit("call_accepted", answer)
    Note over Client A, Client B: P2P connection established via ICE/STUN
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PostgreSQL** 14+ (local or hosted, e.g., [Neon](https://neon.tech), [Supabase](https://supabase.com))

### 1. Clone the Repository

```bash
git clone https://github.com/ANSUJKMEHER/Real-Time-Chat-App.git
cd Real-Time-Chat-App
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/chatdb?schema=public"
JWT_SECRET="your_super_secret_key_here"
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:5173
```

Push the database schema and generate the Prisma client:

```bash
npx prisma db push
npx prisma generate
```

Start the backend server:

```bash
npm run dev
```

> 🟢 Backend runs on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

> **Cloudinary Setup:** Create a free [Cloudinary](https://cloudinary.com) account, then create an **unsigned upload preset** in Settings → Upload for image sharing to work.

Start the frontend dev server:

```bash
npm run dev
```

> 🟢 Frontend runs on `http://localhost:5173`

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `POST` | `/api/auth/reset-password` | Reset user password |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/user?search=query` | Search users by name, email, or username |
| `PUT` | `/api/user/profile` | Update profile picture |

### Friend Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/requests` | Get pending friend requests |
| `POST` | `/api/requests` | Send a friend request |
| `PUT` | `/api/requests/:id` | Accept or reject a request |

### Chats
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/chats` | Get all user's chats |
| `POST` | `/api/chats/group` | Create a group chat |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/messages/:chatId` | Get messages for a chat |
| `POST` | `/api/messages` | Send a new message |

### Socket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `setup` | Client → Server | `user` object | Initialize socket connection |
| `join_chat` | Client → Server | `chatId` | Join a chat room |
| `new_message` | Client → Server | message data | Broadcast new message |
| `message_received` | Server → Client | message data | Receive new message |
| `typing` | Bidirectional | `chatId` | Typing indicator start |
| `stop_typing` | Bidirectional | `chatId` | Typing indicator stop |
| `online_users` | Server → Client | user list | Online users update |
| `call_user` | Bidirectional | WebRTC offer + metadata | Initiate a call |
| `answer_call` | Client → Server | WebRTC answer | Accept incoming call |
| `ice_candidate` | Bidirectional | ICE candidate | WebRTC ICE exchange |
| `end_call` | Bidirectional | `{ to }` | End an active call |
| `reject_call` | Client → Server | `{ to }` | Reject incoming call |

---

## 🏛️ Architecture Decisions

### Backend
- **MVC Pattern** — Clean separation between routes, controllers, and services via a Prisma singleton
- **Centralized Error Handling** — Custom `AppError` class and middleware catches async errors, Prisma errors (e.g., `P2002` unique constraint violations), and JWT verification failures
- **Socket.io Authentication** — Separate JWT validation layer before allowing WebSocket connections; `Map`-based online user tracking for O(1) lookups
- **WebRTC Signaling** — Server acts purely as a signaling relay; actual media streams flow peer-to-peer via STUN servers

### Frontend
- **Context API** — `AuthContext` manages JWT lifecycle, user state, and socket connection (connect on login, disconnect on logout); `ThemeContext` for dark/light mode
- **Axios Interceptors** — Automatically inject JWT into every API request header
- **Vanilla CSS** — Full control over styling without framework overhead; keeps bundle size minimal
- **PWA with Vite** — `vite-plugin-pwa` generates service worker, manifest, and handles installability

---

## 🌐 Deployment

### Frontend (Vercel)

The frontend includes a [`vercel.json`](frontend/vercel.json) with SPA rewrites configured. Simply connect your GitHub repo to [Vercel](https://vercel.com) and it will auto-deploy.

### Backend (Render / Railway / Fly.io)

1. Set the environment variables (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, etc.)
2. Set the **build command** to `npm install && npx prisma generate`
3. Set the **start command** to `npm start`

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m "feat: add amazing feature"`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the **ISC License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Socket.io](https://socket.io/) — Real-time engine
- [Prisma](https://www.prisma.io/) — Next-generation ORM
- [Cloudinary](https://cloudinary.com/) — Image management
- [Lucide](https://lucide.dev/) — Beautiful icons
- [Vite](https://vitejs.dev/) — Lightning-fast build tool

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ANSUJKMEHER">ANSUJKMEHER</a>
</p>
