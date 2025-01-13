import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "./NotificationContext";
import createDebounce, { createAccumulatingDebounce } from "./debounce";

import { useLocation, Navigate } from "react-router-dom";
import api from "./api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileCache, setFileCache] = useState(new Map());
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


  const getCachedFile = (filePath) => {
    return fileCache.get(filePath);
  };

  const setCachedFile = (filePath, fileData) => {
    setFileCache(prev => new Map(prev).set(filePath, fileData));
  };

  const downloadFile = async (filePath, onProgress) => {
    // Check cache first

    console.log("Downloaded file:", filePath);
    const cachedFile = getCachedFile(filePath);
    if (cachedFile) {
      // If we have a cached file, simulate progress and return cached data
      if (onProgress) {
        onProgress(100);
      }
      return cachedFile;
    }

    try {
      // If not in cache, download using general service
      const fileData = await api.general().getFileWithProgress(filePath, onProgress);
      
      console.log('Downloaded file:', fileData);
      // Cache the downloaded file
      setCachedFile(filePath, fileData);
      
      return fileData;
    } catch (error) {
      showError('Failed to download file');
      throw error;
    }
  };

  const uploadFile = async (file, onProgress) => {
    try {
      const response = await api.general().uploadFileWithProgress(file, onProgress);

      console.log("Uploaded file:", response);
      
      // Pre-cache the uploaded file if we have the data
      if (response.path && response.blob) {
        setCachedFile(response.path, {
          blob: response.blob,
          fileName: response.name,
          metadata: response.metadata,
          download: () => api.general().downloadBlob(response.blob, response.name),
          getUrl: () => window.URL.createObjectURL(response.blob)
        });
      }
      
      return response;
    } catch (error) {
      showError('Failed to upload file');
      throw error;
    }
  };

  const clearFileCache = () => {
    // Clear all cached files
    setFileCache(new Map());
  };


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
    clearFileCache(); // Clear file cache on logout
    navigate("/login");
    showSuccess('Logged out successfully');
    return response;
  };

  const category_like_list = async () => {
    const response = await api.categories().category_like_list();
    setUser((prev) => ({ ...prev, category_like_list: response.data }));
    return response;
  };


  const updateCategoryList = async (accumulatedState) => {
    try {
      const currentLikedCategories = user?.category_like_list
        ?.filter(item => item?.id)
        ?.map(item => item.id) || [];
        
      const categoriesToLike = [];
      const categoriesToUnlike = [];
  
      Object.entries(accumulatedState).forEach(([id, clicks]) => {
        const categoryId = Number(id);
        const isCurrentlyLiked = currentLikedCategories.includes(categoryId);
        
        if (isCurrentlyLiked) {
          if (clicks % 2 === 1) {
            categoriesToUnlike.push(categoryId);
          }
        } else {
          if (clicks % 2 === 1) {
            categoriesToLike.push(categoryId);
          }
        }
      });
  
      const combinedlikeandUnlike = [...categoriesToLike, ...categoriesToUnlike];
      
      if (combinedlikeandUnlike.length > 0) {
        const response = await api.categories().updateCategoryLikeList(combinedlikeandUnlike);
        await category_like_list();
        showSuccess('Categories updated successfully');
        return response;
      }
      
    } catch (error) {
      console.error('Error updating categories:', error);
      showError('Failed to update categories');
      throw error;
    }
  };
  
  // Create category handler with array support
  const createCategoryHandler = () => {
    const DELAY = 2000; // 2 seconds
    return createDebounce(
      updateCategoryList,
      DELAY,
      {
        maxWait: DELAY * 1.5,
        accumulator: (acc, value) => {
          const newAcc = { ...(acc || {}) };
          // Handle both single value and array of values
          const values = Array.isArray(value) ? value : [value];
          
          values.forEach(id => {
            newAcc[id] = (newAcc[id] || 0) + 1;
          });
          
          return newAcc;
        },
        initialValue: {}
      }
    );
  };
  
  // Create a single instance of the debounced handler
  const updateCategorylist = createCategoryHandler();

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
        updateCategorylist,
        downloadFile,
        uploadFile,
        getCachedFile,
        clearFileCache
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