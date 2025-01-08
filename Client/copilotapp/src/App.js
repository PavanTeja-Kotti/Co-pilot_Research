import { ConfigProvider, theme } from 'antd';
import { useEffect, useState } from 'react';
import {  Routes, Route, Navigate } from 'react-router-dom';
import { Login, Register } from './components/auth/auth';
import AppLayout from './components/Layout/AppLayout';
import HomePage from './pages/Homepage';
import Profile from './pages/Profile';
import { useAuth } from './utils/auth';
import PrivateRoute from './components/common/PrivateRoute';

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
};

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const themeConfig = {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1677ff',
      borderRadius: 8,
    },
  };

  return (
   
      <ConfigProvider theme={themeConfig}>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
              <Route index path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<h1>sdsdeeee</h1>} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Routes>
       
      </ConfigProvider>
   
  );
};

export default App;