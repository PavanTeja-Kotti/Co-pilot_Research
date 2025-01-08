// src/utils/auth.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [sessionError, setSessionError] = useState(null);
    const navigate = useNavigate();

    // Check authentication status on mount and set up interval
    useEffect(() => {
        checkAuth();
        
        // Set up periodic session checks
        const sessionCheckInterval = setInterval(() => {
            checkAuth(true);
        }, 5 * 60 * 1000); // Check every 5 minutes

        return () => clearInterval(sessionCheckInterval);
    }, []);

    const handleAuthError = (error, silent = false) => {
        setUser(null);
        setIsAuthenticated(false);
        setSessionError(error.message);

        if (!silent) {
            // Redirect to login for auth errors, register for registration errors
            const isRegistrationError = error.message.toLowerCase().includes('registration');
            navigate(isRegistrationError ? '/register' : '/login', {
                state: { 
                    error: error.message,
                    returnTo: window.location.pathname 
                }
            });
        }
    };

    const checkAuth = async (silent = false) => {
        try {
            const userData = await api.getUserInfo();
            setUser(userData);
            setIsAuthenticated(true);
            setSessionError(null);
        } catch (error) {
            handleAuthError(error, silent);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const userData = await api.login(username, password);
            setUser(userData);
            setIsAuthenticated(true);
            setSessionError(null);
            return userData;
        } catch (error) {
            handleAuthError(new Error('Invalid credentials. Please try again.'));
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            const newUser = await api.register(userData);
            setUser(newUser);
            setIsAuthenticated(true);
            setSessionError(null);
            return newUser;
        } catch (error) {
            handleAuthError(new Error('Registration failed. Please try a different username.'));
            throw error;
        }
    };

    const logout = async () => {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
            navigate('/login');
        }
    };

    return (
        <AuthContext.Provider 
            value={{ 
                user, 
                loading, 
                isAuthenticated, 
                sessionError,
                login, 
                logout, 
                register,
                checkAuth 
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};


export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};



