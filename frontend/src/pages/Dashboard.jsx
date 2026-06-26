import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../App';
import api from '../services/api';
import { socket } from '../services/socket';
import { LogOut, Send, MessageSquare, Users, Bell, User as UserIcon, Smile, UserPlus, Sun, Moon, MoreVertical, Phone, Video, ArrowLeft, Image as ImageIcon, Loader2, Reply, Download } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import VideoCallModal from '../components/VideoCallModal';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typing, setTyping] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Video/Voice Call state
    const [incomingCall, setIncomingCall] = useState(null);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [callingUser, setCallingUser] = useState(null);
    const [callType, setCallType] = useState('video'); // 'video' or 'audio'

    // Modals & Feature state
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);

    // Requests & Profile state
    const [pendingRequests, setPendingRequests] = useState([]);
    const [profilePicInput, setProfilePicInput] = useState(user?.profilePic || '');

    // Group Chat state
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const endOfMessagesRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        socket.emit('setup', user);
        socket.on('connected', () => setSocketConnected(true));
        socket.on('online_users', (users) => setOnlineUsers(users));
        
        // Request Notification Permission on first user interaction
        const handleFirstInteraction = () => {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
            document.removeEventListener('click', handleFirstInteraction);
        };
        document.addEventListener('click', handleFirstInteraction);

        // Listen for real-time chat updates
        socket.on('fetch_chats', () => {
            fetchChats();
        });

        // Listen for incoming calls
        socket.on('call_user', (data) => {
            setIncomingCall(data);
            setCallType(data.callType || 'video');
            setShowVideoCall(true);
            
            // Trigger a native phone popup/notification
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    navigator.serviceWorker.ready.then((registration) => {
                        registration.showNotification(`Incoming ${data.callType || 'video'} call`, {
                            body: `${data.name} is calling you...`,
                            icon: '/pwa-192x192.png',
                            vibrate: [200, 100, 200, 100, 200, 100, 200],
                            tag: 'incoming-call',
                            requireInteraction: true
                        });
                    });
                } catch (e) {
                    new Notification(`Incoming ${data.callType || 'video'} call`, {
                        body: `${data.name} is calling you...`,
                        icon: '/pwa-192x192.png'
                    });
                }
            }
        });

        return () => {
            socket.off('connected');
            socket.off('online_users');
            socket.off('fetch_chats');
            socket.off('call_user');
        };
    }, [user]);

    const fetchChats = async () => {
        try {
            const { data } = await api.get('/chats');
            setChats(data.data);
        } catch (error) {
            console.error('Failed to fetch chats');
        }
    };

    const fetchMessages = async () => {
        if (!selectedChat) return;
        try {
            const { data } = await api.get(`/messages/${selectedChat.id}`);
            setMessages(data.data);
            socket.emit('join_chat', selectedChat.id);
        } catch (error) {
            console.error('Failed to fetch messages');
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const { data } = await api.get('/requests');
            setPendingRequests(data.data);
        } catch (error) {
            console.error('Failed to fetch requests');
        }
    };

    useEffect(() => {
        fetchChats();
        fetchPendingRequests();
    }, []);

    useEffect(() => {
        fetchMessages();
        // eslint-disable-next-line
    }, [selectedChat]);

    useEffect(() => {
        const messageHandler = (newMessageReceived) => {
            if (!selectedChat || selectedChat.id !== newMessageReceived.chatId) {
                // Notification logic could go here
                fetchChats(); // Update last message in sidebar
            } else {
                setMessages(prev => [...prev, newMessageReceived]);
            }
        };

        socket.on('message_received', messageHandler);

        socket.on('typing', () => setIsTyping(true));
        socket.on('stop_typing', () => setIsTyping(false));

        return () => {
            socket.off('message_received', messageHandler);
            socket.off('typing');
            socket.off('stop_typing');
        };
    }, [selectedChat]);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const downloadImage = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename || 'download.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed', error);
        }
    };

    const handleImageUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'chatting_app');
        formData.append('cloud_name', 'dnhy9i2uk');

        try {
            const res = await fetch('https://api.cloudinary.com/v1_1/dnhy9i2uk/image/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            return data.secure_url;
        } catch (error) {
            console.error('Cloudinary upload failed', error);
            throw error;
        }
    };

    const isDifferentDay = (date1, date2) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return d1.toDateString() !== d2.toDateString();
    };

    const formatDateSeparator = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedImage) || !selectedChat) return;

        socket.emit('stop_typing', selectedChat.id);
        setTyping(false);

        try {
            setIsUploading(true);
            let imageUrl = null;
            if (selectedImage) {
                imageUrl = await handleImageUpload(selectedImage);
            }

            const content = newMessage;
            const replyToId = replyingTo?.id || null;
            setNewMessage('');
            setSelectedImage(null);
            setReplyingTo(null);
            
            const { data } = await api.post('/messages', {
                content,
                image: imageUrl,
                chatId: selectedChat.id,
                replyToId
            });

            socket.emit('new_message', data.data);
            setMessages([...messages, data.data]);
            fetchChats(); // Update order / last message
        } catch (error) {
            console.error('Failed to send message');
        } finally {
            setIsUploading(false);
        }
    };

    const typingHandler = (e) => {
        setNewMessage(e.target.value);

        if (!socketConnected || !selectedChat) return;

        if (!typing) {
            setTyping(true);
            socket.emit('typing', selectedChat.id);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', selectedChat.id);
            setTyping(false);
        }, 3000);
    };

    const getChatName = (chat) => {
        if (chat.isGroup) return chat.name;
        const otherMember = chat.members.find(m => m.userId !== user.id);
        return otherMember ? otherMember.user.name : 'Unknown';
    };

    const handleSearch = async (queryToSearch = searchQuery) => {
        if (!queryToSearch) return;
        setSearchLoading(true);
        try {
            const { data } = await api.get(`/user?search=${queryToSearch}`);
            setSearchResult(data.data);
        } catch (error) {
            console.error('Failed to search users');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleGroupSearch = async (e) => {
        setSearchQuery(e.target.value);
        if (!e.target.value) {
            setSearchResult([]);
            return;
        }
        await handleSearch(e.target.value);
    };

    const handleSelectUser = (userToAdd) => {
        if (selectedUsers.find(u => u.id === userToAdd.id)) {
            return; // Already added
        }
        setSelectedUsers([...selectedUsers, userToAdd]);
    };

    const handleRemoveUser = (userToRemove) => {
        setSelectedUsers(selectedUsers.filter(u => u.id !== userToRemove.id));
    };

    const createGroupChat = async () => {
        if (!groupName || selectedUsers.length < 2) {
            alert('Please enter a group name and select at least 2 users');
            return;
        }

        try {
            const { data } = await api.post('/chats/group', {
                name: groupName,
                users: JSON.stringify(selectedUsers.map(u => u.id))
            });
            setChats([data.data, ...chats]);
            setShowGroupModal(false);
            setSearchResult([]);
            setSearchQuery('');
            setGroupName('');
            setSelectedUsers([]);
            alert('Group chat created!');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create group chat');
        }
    };

    const sendChatRequest = async (userId) => {
        try {
            await api.post('/requests', { receiverId: userId });
            alert('Friend request sent!');
            setShowUsersModal(false);
            setSearchResult([]);
            setSearchQuery('');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to send request');
        }
    };

    const handleRequestResponse = async (requestId, status) => {
        try {
            await api.put(`/requests/${requestId}`, { status });
            // Remove from list
            setPendingRequests(prev => prev.filter(r => r.id !== requestId));
            if (status === 'ACCEPTED') {
                fetchChats(); // Refresh chats sidebar
            }
        } catch (error) {
            alert('Failed to respond to request');
        }
    };

    const updateProfilePic = async () => {
        try {
            const { data } = await api.put('/user/profile', { profilePic: profilePicInput });
            alert('Profile picture updated!');
            // Reload window to refetch user context, or ideally update AuthContext
            window.location.reload();
        } catch (error) {
            alert('Failed to update profile picture');
        }
    };

    // Close menu if clicked outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.dropdown-container')) {
                setShowMenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const startCall = (type) => {
        if (!selectedChat || selectedChat.isGroup) return;
        const otherMember = selectedChat.members.find(m => m.userId !== user.id);
        if (otherMember) {
            setCallType(type);
            setCallingUser(otherMember.user);
            setShowVideoCall(true);
        }
    };

    return (
        <div className={`dashboard ${selectedChat ? 'chat-active' : ''}`}>
            {showVideoCall && (
                <VideoCallModal 
                    user={user}
                    socket={socket}
                    callData={incomingCall}
                    remoteUser={callingUser}
                    callType={callType}
                    onClose={() => {
                        setShowVideoCall(false);
                        setIncomingCall(null);
                        setCallingUser(null);
                    }}
                />
            )}
            
            <div className="sidebar">
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {user.profilePic ? (
                            <img src={user.profilePic} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div className="user-avatar">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.2 }}>{user.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{user.username}</div>
                        </div>
                    </div>
                    <div className="sidebar-actions">
                        <button onClick={() => setShowRequestsModal(true)} className="icon-btn" title="Requests" style={{ position: 'relative' }}>
                            <Bell size={18} />
                            {pendingRequests.length > 0 && (
                                <span className="badge"></span>
                            )}
                        </button>
                        <button onClick={() => setShowProfileModal(true)} className="icon-btn" title="Profile">
                            <UserIcon size={18} />
                        </button>

                        {/* Three Dots Menu */}
                        <div className="dropdown-container" style={{ position: 'relative' }}>
                            <button onClick={() => setShowMenu(!showMenu)} className="icon-btn" title="More Options">
                                <MoreVertical size={18} />
                            </button>
                            
                            {showMenu && (
                                <div className="dropdown-menu">
                                    <div className="dropdown-item" onClick={() => { setShowGroupModal(true); setSearchQuery(''); setSearchResult([]); setShowMenu(false); }}>
                                        <Users size={16} /> Create Group
                                    </div>
                                    <div className="dropdown-item" onClick={() => { setShowUsersModal(true); setSearchQuery(''); setSearchResult([]); setShowMenu(false); }}>
                                        <UserPlus size={16} /> Add Friend
                                    </div>
                                    <div className="dropdown-item" onClick={() => { toggleTheme(); setShowMenu(false); }}>
                                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} 
                                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    <div className="dropdown-item danger" onClick={logout}>
                                        <LogOut size={16} /> Logout
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="chat-list">
                    {chats.map(chat => (
                        <div
                            key={chat.id}
                            className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                            onClick={() => setSelectedChat(chat)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div className="chat-icon">
                                    {chat.isGroup ? <Users size={18} /> : <MessageSquare size={18} />}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div className="chat-name">{getChatName(chat)}</div>
                                    {chat.messages && chat.messages.length > 0 && (
                                        <div className="chat-last-msg">
                                            {chat.messages[0].content || (chat.messages[0].image ? '📷 Photo' : '')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {chats.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                            <MessageSquare size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                            <div style={{ fontSize: '0.9rem' }}>No chats yet.</div>
                            <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Start a conversation!</div>
                        </div>
                    )}
                </div>
            </div>

            <div className="chat-area">
                {selectedChat ? (
                    <>
                        <div className="chat-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button className="mobile-back-btn icon-btn" onClick={() => setSelectedChat(null)} style={{ padding: '0.2rem', marginLeft: '-0.5rem' }}>
                                    <ArrowLeft size={20} />
                                </button>
                                <div style={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                                    {getChatName(selectedChat)}
                                </div>
                            </div>
                            {!selectedChat.isGroup && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => startCall('audio')} className="icon-btn" title="Voice Call">
                                        <Phone size={18} />
                                    </button>
                                    <button onClick={() => startCall('video')} className="icon-btn" title="Video Call">
                                        <Video size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="messages-container">
                            {messages.map((m, i) => {
                                const isOwn = m.senderId === user.id;
                                const showDate = i === 0 || isDifferentDay(messages[i-1].createdAt, m.createdAt);
                                
                                return (
                                    <React.Fragment key={m.id || i}>
                                        {showDate && (
                                            <div className="date-separator">
                                                <span>{formatDateSeparator(m.createdAt)}</span>
                                            </div>
                                        )}
                                        <div className={`message ${isOwn ? 'own' : 'other'}`}>
                                            <button className="reply-btn" onClick={() => setReplyingTo(m)} title="Reply">
                                                <Reply size={14} />
                                            </button>
                                            
                                            {!isOwn && selectedChat.isGroup && (
                                                <div className="message-sender">{m.sender?.name}</div>
                                            )}

                                            {m.replyTo && (
                                                <div className="reply-block">
                                                    <div style={{fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.1rem'}}>
                                                        {m.replyTo.sender?.name}
                                                    </div>
                                                    <div style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                        {m.replyTo.content || (m.replyTo.image ? '📷 Photo' : 'Message')}
                                                    </div>
                                                </div>
                                            )}

                                            {m.image && (
                                                <div className="image-container" style={{ marginBottom: m.content ? '0.5rem' : '0' }}>
                                                    <img src={m.image} alt="attachment" style={{ maxWidth: '100%', borderRadius: '0.75rem', maxHeight: '250px', objectFit: 'contain', display: 'block' }} />
                                                    <button className="image-download-btn" onClick={() => downloadImage(m.image, `image-${m.id}.png`)} title="Download Image">
                                                        <Download size={16} />
                                                    </button>
                                                </div>
                                            )}
                                            {m.content && <div>{m.content}</div>}
                                            <div className="message-time">
                                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            {isTyping && (
                                <div className="typing-indicator">
                                    <div className="typing-dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                    typing
                                </div>
                            )}
                            <div ref={endOfMessagesRef} />
                        </div>

                        <div className="message-input-area">
                            {replyingTo && (
                                <div className="reply-context">
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{fontWeight: 600, color: 'var(--accent)', marginBottom: '0.2rem', fontSize: '0.8rem'}}>Replying to {replyingTo.sender?.name}</div>
                                        <div style={{color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem'}}>
                                            {replyingTo.content || (replyingTo.image ? '📷 Photo' : '')}
                                        </div>
                                    </div>
                                    <div className="reply-close" onClick={() => setReplyingTo(null)} title="Cancel reply">
                                        <div style={{ fontSize: '1.2rem', padding: '0 0.5rem' }}>&times;</div>
                                    </div>
                                </div>
                            )}
                            {selectedImage && (
                                <div style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ position: 'relative' }}>
                                        <img src={URL.createObjectURL(selectedImage)} alt="preview" style={{ height: '60px', borderRadius: '0.5rem' }} />
                                        <button 
                                            onClick={() => setSelectedImage(null)} 
                                            style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px' }}>
                                            &times;
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Image attached</div>
                                </div>
                            )}
                            <form onSubmit={sendMessage} className="input-form" style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="emoji-btn"
                                    title="Attach Image"
                                >
                                    <ImageIcon size={20} />
                                </button>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                    ref={fileInputRef} 
                                    onChange={(e) => {
                                        if (e.target.files[0]) setSelectedImage(e.target.files[0]);
                                    }} 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="emoji-btn"
                                >
                                    <Smile size={20} />
                                </button>
                                {showEmojiPicker && (
                                    <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 50, marginBottom: '0.5rem' }}>
                                        <EmojiPicker
                                            theme={theme}
                                            onEmojiClick={(emojiData) => {
                                                setNewMessage(prev => prev + emojiData.emoji);
                                                setShowEmojiPicker(false);
                                            }}
                                        />
                                    </div>
                                )}
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={typingHandler}
                                />
                                <button type="submit" className="send-btn" disabled={(!newMessage.trim() && !selectedImage) || isUploading}>
                                    {isUploading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <MessageSquare size={56} style={{ opacity: 0.3 }} />
                        <h2>Select a chat to start messaging</h2>
                        <p>Pick a conversation from the sidebar</p>
                    </div>
                )}
            </div>

            {/* Add Friend Modal */}
            {showUsersModal && (
                <div className="users-dialog" onClick={() => setShowUsersModal(false)}>
                    <div className="users-card" onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1.25rem' }}>Start New Chat</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Search by name, email or @username"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="modal-input"
                                style={{ flex: 1 }}
                            />
                            <button onClick={() => handleSearch()} className="modal-btn primary">
                                {searchLoading ? '...' : 'Go'}
                            </button>
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {searchResult.map(u => (
                                <div key={u.id} className="modal-user-item">
                                    <div>
                                        <div className="user-name">{u.name}</div>
                                        <div className="user-email">@{u.username} · {u.email}</div>
                                    </div>
                                    <button onClick={() => sendChatRequest(u.id)} className="modal-btn primary">
                                        Add
                                    </button>
                                </div>
                            ))}
                            {searchResult.length === 0 && !searchLoading && searchQuery && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.88rem' }}>No users found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Requests Modal */}
            {showRequestsModal && (
                <div className="users-dialog" onClick={() => setShowRequestsModal(false)}>
                    <div className="users-card" onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1.25rem' }}>Pending Requests</h3>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {pendingRequests.map(req => (
                                <div key={req.id} className="modal-user-item">
                                    <div>
                                        <div className="user-name">{req.sender.name}</div>
                                        <div className="user-email">@{req.sender.username} · {req.sender.email}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => handleRequestResponse(req.id, 'ACCEPTED')} className="modal-btn primary">Accept</button>
                                        <button onClick={() => handleRequestResponse(req.id, 'REJECTED')} className="modal-btn danger">Decline</button>
                                    </div>
                                </div>
                            ))}
                            {pendingRequests.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.88rem' }}>No pending requests</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="users-dialog" onClick={() => setShowProfileModal(false)}>
                    <div className="users-card" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>Profile Settings</h3>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>@{user.username}</div>
                        <div style={{ marginBottom: '1.25rem' }}>
                            {user.profilePic ? (
                                <img src={profilePicInput || user.profilePic} alt="preview" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', margin: '0 auto', display: 'block' }} />
                            ) : (
                                <div className="user-avatar large" style={{ margin: '0 auto' }}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Profile Picture URL..."
                            value={profilePicInput}
                            onChange={e => setProfilePicInput(e.target.value)}
                            className="modal-input"
                            style={{ marginBottom: '1rem' }}
                        />
                        <button onClick={updateProfilePic} className="modal-btn primary" style={{ width: '100%', padding: '0.7rem' }}>Save Profile</button>
                    </div>
                </div>
            )}

            {/* Group Chat Modal */}
            {showGroupModal && (
                <div className="users-dialog" onClick={() => setShowGroupModal(false)}>
                    <div className="users-card" onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1.25rem' }}>Create Group Chat</h3>

                        <input
                            type="text"
                            placeholder="Group Name"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            className="modal-input"
                            style={{ marginBottom: '1rem' }}
                        />

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                            {selectedUsers.map(u => (
                                <div key={u.id} className="user-tag">
                                    {u.name}
                                    <span className="remove" onClick={() => handleRemoveUser(u)}>&times;</span>
                                </div>
                            ))}
                        </div>

                        <input
                            type="text"
                            placeholder="Search by name, email or @username"
                            value={searchQuery}
                            onChange={handleGroupSearch}
                            className="modal-input"
                            style={{ marginBottom: '1rem' }}
                        />

                        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
                            {searchResult.slice(0, 5).map(u => (
                                <div key={u.id} onClick={() => handleSelectUser(u)} className="modal-user-item" style={{ cursor: 'pointer' }}>
                                    <div>
                                        <div className="user-name">{u.name}</div>
                                        <div className="user-email">@{u.username} · {u.email}</div>
                                    </div>
                                    <button className="modal-btn primary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                                        Select
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button onClick={createGroupChat} className="modal-btn primary" style={{ width: '100%', padding: '0.7rem' }}>Create Group</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
