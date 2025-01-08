import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                if (localStorage.getItem('accessToken')) {
                    const profile = await api.accounts().getProfile();
                    setUser(profile);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            } finally {
                setLoading(false);
            }
        };
        
        checkAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const user = await api.accounts().login(email, password);
            setUser(user);
            navigate('/dashboard');
            return user;
        } catch (error) {
            throw new Error('Login failed');
        }
    };

    const register = async (email, username, password) => {
        try {
            const user = await api.accounts().register(email, username, password);
            setUser(user);
            navigate('/dashboard');
            return user;
        } catch (error) {
            throw new Error('Registration failed');
        }
    };

    const logout = () => {
        api.accounts().logout();
        setUser(null);
        navigate('/login');
    };

    if (loading) return <div>Loading...</div>;

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};