import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const { data } = await api.get('/auth/me');
                    setUser(data.data);
                    connectSocket();
                } catch (error) {
                    console.error('Failed to fetch user', error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };

        fetchUser();

        return () => {
            disconnectSocket();
        };
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        setUser(data.data);
        connectSocket();
    };

    const register = async (name, username, email, password) => {
        const { data } = await api.post('/auth/register', { name, username, email, password });
        localStorage.setItem('token', data.token);
        setUser(data.data);
        connectSocket();
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        disconnectSocket();
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
