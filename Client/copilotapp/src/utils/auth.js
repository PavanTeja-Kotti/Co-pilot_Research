
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from './NotificationContext';
import api from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { showError } = useNotification();

    useEffect(() => {
        // Set up API error handling
        api.setNotificationCallback((message, error) => {
            showError(error || message);
        });

        const checkAuth = async () => {
            try {
                if (localStorage.getItem('accessToken')) {
                    const response = await api.accounts().getProfile();
                    if (response.success) {
                        setUser(response.data);
                    }
                }
            } finally {
                setLoading(false);
            }
        };
        
        checkAuth();
    }, []);

    const login = async (email, password) => {
        const response = await api.accounts().login(email, password);
        if (response.success) {
            setUser(response.data);
            navigate('/');
            return response.data;
        }
        throw new Error(response.message || 'Login failed');
    };

    const register = async (email, username, password, password_confirm, first_name, last_name) => {
        const response = await api.accounts().register(email, username, password, password_confirm, first_name, last_name);
        if (response.success) {
            // setUser(response.data);
            navigate('/login');
            return response.data;
        }
        throw new Error(response.message || 'Registration failed');
    };

    const updateProfile = async (userData) => {
        try {
            const response = await api.accounts().updateProfile(userData);      
            if (response.data) {
                setUser(response.data);
                // showSuccess('Profile updated successfully');
                return response.data;
            }
            throw new Error('Failed to update profile');
        } catch (error) {
            showError(error.message);
            throw error;
        }
    };

    const deleteProfile = async () => {
        try {
            const response = await api.accounts().deleteProfile();
            if (response.data) {
                setUser(null);
                // showSuccess('Account deactivated successfully');
                navigate('/login');
                return response.data;
            }
            throw new Error('Failed to deactivate account');
        } catch (error) {
            showError(error.message);
            throw error;
        }
    };

    const changePassword  = async (oldPassword, newPassword) =>  {
        try {
            const response = await api.accounts().changePassword(oldPassword, newPassword);
            if (response.data) {
                // setUser(null);
                // showSuccess('Account deactivated successfully');
                // navigate('/login');
                return response.data;
            }
            throw new Error('Failed to changePassword ');
        } catch (error) {
            showError(error.message);
            throw error;
        }


    }




    

    const logout = async () => {
        const response = await api.accounts().logout();
        setUser(null);
        navigate('/login');
        return response;
    };

    if (loading) return <div>Loading...</div>;

    return (
        <AuthContext.Provider value={{ user, login, logout, register,updateProfile,
            deleteProfile ,changePassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
