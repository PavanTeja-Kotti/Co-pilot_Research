import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "./NotificationContext";

import { useLocation, Navigate } from "react-router-dom";
import api from "./api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();

  useEffect(() => {
    // Set up API error handling
    api.setNotificationCallback((message, error) => {
      showError(error || message);
    });

    const checkAuth = async () => {
      try {
        if (localStorage.getItem("accessToken")) {
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
      const hasInterests = response.data && response.data?.first_login;
      setUser(response.data);
      showSuccess('Logged in successfully');
      setTimeout(() => {
        navigate(hasInterests ? "/interest" : "/");
      }, 0);
      return response.data;
    }
    throw new Error(response.message || "Login failed");
  };

  const register = async (
    email,
    username,
    password,
    password_confirm,
    first_name,
    last_name
  ) => {
    const response = await api
      .accounts()
      .register(
        email,
        username,
        password,
        password_confirm,
        first_name,
        last_name
      );
    if (response.success) {
      navigate("/login");
      showSuccess('Registration successful. Please login to continue.');
      return response.data;
    }
    throw new Error(response.message || "Registration failed");
  };

  const updateProfile = async (userData) => {
    try {
      const response = await api.accounts().updateProfile(userData);
      if (response.data) {
        setUser(response.data);
        showSuccess('Profile updated successfully');
        return response.data;
      }
      throw new Error("Failed to update profile");
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
        showSuccess('Account deactivated successfully');
        navigate("/login");
        return response.data;
      }
      throw new Error("Failed to deactivate account");
    } catch (error) {
      showError(error.message);
      throw error;
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await api
        .accounts()
        .changePassword(oldPassword, newPassword);
      if (response.data) {
        showSuccess('Password changed successfully');
        return response.data;
      }
      throw new Error("Failed to change password");
    } catch (error) {
      showError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    const response = await api.accounts().logout();
    setUser(null);
    navigate("/login");
    showSuccess('Logged out successfully');
    return response;
  };

  const category_like_list = async () => {
    const response = await api.categories().category_like_list();
    setUser((prev) => ({ ...prev, category_like_list: response.data }));
    return response;
  };

  const updateCategorylist = async (category_ids) => {
    const currentLikedCategories = user?.category_like_list
      ?.filter(item => item?.id)
      ?.map(item => item.id) || [];
    const categoriesToLike = [];
    const categoriesToUnlike = [];

    currentLikedCategories.forEach(id => {
      if (category_ids.includes(id)) {
        categoriesToUnlike.push(id);
      }
    });
    
    const clickCounts = {};
    category_ids.forEach(id => {
      clickCounts[id] = (clickCounts[id] || 0) + 1;
    });
    
    category_ids.forEach(id => {
      if (currentLikedCategories.includes(id)) {
        if (clickCounts[id] > 1 && !categoriesToLike.includes(id)) {
          categoriesToLike.push(id);
        }
      } else {
        if (clickCounts[id] % 2 === 1 && !categoriesToLike.includes(id)) {
          categoriesToLike.push(id);
        }
      }
    });

    const combinedlikeandUnlike = [...categoriesToLike, ...categoriesToUnlike];
    const response = await api.categories().updateCategoryLikeList(combinedlikeandUnlike);
    console.log(combinedlikeandUnlike);
    await category_like_list();
    showSuccess('Categories updated successfully');
    return response;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        register,
        updateProfile,
        deleteProfile,
        changePassword,
        category_like_list,
        updateCategorylist
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};