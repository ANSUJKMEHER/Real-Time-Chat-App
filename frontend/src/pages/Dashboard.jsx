import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { socket } from '../services/socket';
import { LogOut, Send, MessageSquare, Users, PlusCircle, Bell, User as UserIcon, Smile, UserPlus } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typing, setTyping] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);

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

    useEffect(() => {
        socket.emit('setup', user);
        socket.on('connected', () => setSocketConnected(true));
        socket.on('online_users', (users) => setOnlineUsers(users));

        return () => {
            socket.off('connected');
            socket.off('online_users');
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
        socket.on('message_received', (newMessageReceived) => {
            if (!selectedChat || selectedChat.id !== newMessageReceived.chatId) {
                // Notification logic could go here
                fetchChats(); // Update last message in sidebar
            } else {
                setMessages([...messages, newMessageReceived]);
            }
        });

        socket.on('typing', () => setIsTyping(true));
        socket.on('stop_typing', () => setIsTyping(false));

        return () => {
            socket.off('message_received');
            socket.off('typing');
            socket.off('stop_typing');
        };
    }, [selectedChat, messages]);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        socket.emit('stop_typing', selectedChat.id);
        setTyping(false);

        try {
            const content = newMessage;
            setNewMessage('');
            const { data } = await api.post('/messages', {
                content,
                chatId: selectedChat.id
            });

            socket.emit('new_message', data.data);
            setMessages([...messages, data.data]);
            fetchChats(); // Update order / last message
        } catch (error) {
            console.error('Failed to send message');
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

    return (
        <div className="dashboard">
            <div className="sidebar">
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {user.profilePic ? (
                            <img src={user.profilePic} alt="avatar" style={{ width: 35, height: 35, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div className="user-avatar" style={{ width: 35, height: 35, borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span>{user.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={() => { setShowGroupModal(true); setSearchQuery(''); setSearchResult([]); }} className="logout-btn" title="Create Group">
                            <Users size={20} />
                        </button>
                        <button onClick={() => { setShowUsersModal(true); setSearchQuery(''); setSearchResult([]); }} className="logout-btn" title="Add Friend">
                            <UserPlus size={20} />
                        </button>
                        <button onClick={() => setShowRequestsModal(true)} className="logout-btn" title="Requests" style={{ position: 'relative' }}>
                            <Bell size={20} />
                            {pendingRequests.length > 0 && (
                                <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger)', borderRadius: '50%', width: '10px', height: '10px' }}></span>
                            )}
                        </button>
                        <button onClick={() => setShowProfileModal(true)} className="logout-btn" title="Profile">
                            <UserIcon size={20} />
                        </button>
                        <button onClick={logout} className="logout-btn" title="Logout">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                <div className="chat-list">
                    {chats.map(chat => (
                        <div
                            key={chat.id}
                            className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                            onClick={() => setSelectedChat(chat)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {chat.isGroup ? <Users size={20} /> : <MessageSquare size={20} />}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div className="chat-name">{getChatName(chat)}</div>
                                    {chat.messages && chat.messages.length > 0 && (
                                        <div className="chat-last-msg">
                                            {chat.messages[0].content}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {chats.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No chats yet.<br />Start a conversation!
                        </div>
                    )}
                </div>
            </div>

            <div className="chat-area">
                {selectedChat ? (
                    <>
                        <div className="chat-header">
                            <div style={{ fontWeight: 600, fontSize: '1.2rem' }}>
                                {getChatName(selectedChat)}
                            </div>
                        </div>

                        <div className="messages-container">
                            {messages.map((m, i) => {
                                const isOwn = m.senderId === user.id;
                                return (
                                    <div key={m.id || i} className={`message ${isOwn ? 'own' : 'other'}`}>
                                        {!isOwn && selectedChat.isGroup && (
                                            <div className="message-sender">{m.sender?.name}</div>
                                        )}
                                        <div>{m.content}</div>
                                        <div className="message-time">
                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                );
                            })}
                            {isTyping && (
                                <div className="typing-indicator">Someone is typing...</div>
                            )}
                            <div ref={endOfMessagesRef} />
                        </div>

                        <div className="message-input-area">
                            <form onSubmit={sendMessage} className="input-form" style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="send-btn"
                                    style={{ backgroundColor: 'var(--bg-input)' }}
                                >
                                    <Smile size={20} />
                                </button>
                                {showEmojiPicker && (
                                    <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 50, marginBottom: '0.5rem' }}>
                                        <EmojiPicker
                                            theme="dark"
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
                                <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <MessageSquare size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h2>Select a chat to start messaging</h2>
                    </div>
                )}
            </div>

            {showUsersModal && (
                <div className="users-dialog" onClick={() => setShowUsersModal(false)}>
                    <div className="users-card" onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1rem' }}>Start New Chat</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Search by name or email"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: '#fff' }}
                            />
                            <button onClick={handleSearch} className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                                {searchLoading ? '...' : 'Go'}
                            </button>
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {searchResult.map(u => (
                                <div key={u.id} className="chat-item" style={{ borderRadius: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                    </div>
                                    <button onClick={() => sendChatRequest(u.id)} className="btn-primary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                                        Add
                                    </button>
                                </div>
                            ))}
                            {searchResult.length === 0 && !searchLoading && searchQuery && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem' }}>No users found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {showRequestsModal && (
                <div className="users-dialog" onClick={() => setShowRequestsModal(false)}>
                    <div className="users-card" onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1rem' }}>Pending Requests</h3>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {pendingRequests.map(req => (
                                <div key={req.id} className="chat-item" style={{ borderRadius: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{req.sender.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{req.sender.email}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => handleRequestResponse(req.id, 'ACCEPTED')} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Accept</button>
                                        <button onClick={() => handleRequestResponse(req.id, 'REJECTED')} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.8rem', backgroundColor: 'var(--danger)' }}>Decline</button>
                                    </div>
                                </div>
                            ))}
                            {pendingRequests.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem' }}>No pending requests</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showProfileModal && (
                <div className="users-dialog" onClick={() => setShowProfileModal(false)}>
                    <div className="users-card" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Profile Settings</h3>
                        <div style={{ marginBottom: '1rem' }}>
                            {user.profilePic ? (
                                <img src={profilePicInput || user.profilePic} alt="preview" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', margin: '0 auto' }} />
                            ) : (
                                <div style={{ width: 100, height: 100, borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2rem', margin: '0 auto' }}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Profile Picture URL..."
                            value={profilePicInput}
                            onChange={e => setProfilePicInput(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: '#fff', marginBottom: '1rem' }}
                        />
                        <button onClick={updateProfilePic} className="btn-primary" style={{ width: '100%', padding: '0.6rem' }}>Save Profile</button>
                    </div>
                </div>
            )}

            {showGroupModal && (
                <div className="users-dialog" onClick={() => setShowGroupModal(false)}>
                    <div className="users-card" onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1rem' }}>Create Group Chat</h3>

                        <input
                            type="text"
                            placeholder="Group Name"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: '#fff', marginBottom: '1rem' }}
                        />

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                            {selectedUsers.map(u => (
                                <div key={u.id} style={{ backgroundColor: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {u.name}
                                    <span onClick={() => handleRemoveUser(u)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>&times;</span>
                                </div>
                            ))}
                        </div>

                        <input
                            type="text"
                            placeholder="Add Users (Search by name or email)"
                            value={searchQuery}
                            onChange={handleGroupSearch}
                            style={{ width: '100%', flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: '#fff', marginBottom: '1rem' }}
                        />

                        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
                            {searchResult.slice(0, 5).map(u => (
                                <div key={u.id} onClick={() => handleSelectUser(u)} className="chat-item" style={{ borderRadius: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                    </div>
                                    <button className="btn-primary" style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
                                        Select
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button onClick={createGroupChat} className="btn-primary" style={{ width: '100%', padding: '0.6rem' }}>Create Group</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
