import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Forgot Password State
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResetLoading(true);
        setResetError('');
        setResetSuccess('');

        try {
            const res = await api.post('/auth/reset-password-casual', { email: resetEmail, newPassword });
            if (res.data.success) {
                setResetSuccess('Password updated successfully! You can now log in.');
                setTimeout(() => {
                    setShowResetModal(false);
                    setResetSuccess('');
                    setResetEmail('');
                    setNewPassword('');
                }, 3000);
            }
        } catch (err) {
            setResetError(err.response?.data?.error || 'Failed to reset password.');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Welcome Back</h2>
                <p>Log in to access your chats</p>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="name@example.com"
                        />
                    </div>
                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <label>Password</label>
                            <span 
                                onClick={() => setShowResetModal(true)} 
                                style={{ fontSize: '0.85rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: '500' }}
                            >
                                Forgot Password?
                            </span>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-link">
                    Don't have an account? <Link to="/register">Register here</Link>
                </div>
            </div>

            {/* Password Reset Modal */}
            {showResetModal && (
                <div className="video-modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="auth-card" style={{ position: 'relative', maxWidth: '400px', width: '90%' }}>
                        <button 
                            onClick={() => setShowResetModal(false)} 
                            style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
                        >
                            &times;
                        </button>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Reset Password</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Enter your email and a new password to update it instantly.
                        </p>

                        {resetError && <div className="error-msg">{resetError}</div>}
                        {resetSuccess && <div className="error-msg" style={{ background: 'rgba(0, 200, 83, 0.1)', color: '#00e676', border: '1px solid rgba(0, 200, 83, 0.2)' }}>{resetSuccess}</div>}

                        <form onSubmit={handleResetPassword}>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    required
                                    placeholder="Enter your email"
                                />
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    placeholder="Enter new password"
                                    minLength="6"
                                />
                            </div>
                            <button type="submit" className="btn-primary" disabled={resetLoading}>
                                {resetLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
