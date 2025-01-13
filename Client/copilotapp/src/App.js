import { ConfigProvider, theme } from 'antd';
import { useEffect, useState } from 'react';
import {  Routes, Route, Navigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Login, Register } from './components/auth/auth';
import AppLayout from './components/Layout/AppLayout';
import HomePage from './pages/Homepage';
import Profile from './pages/Profile';
import { useAuth } from './utils/auth';
import PrivateRoute from './components/common/PrivateRoute';
import {InterestPage} from './pages/InterestPage';
import {chatapi} from './utils/socket';

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation(); // Import useLocation from react-router-dom
  
  if (user) {
    // If we're coming from the login page, don't redirect
    if (location.pathname === '/login') {
      return null; // Let the login page handle navigation
    }
    // For other public routes, redirect to home
    return <Navigate to="/" replace />;
  }
  
  return children;
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

  useEffect(() => {
    return () => {
      // chatapi.destroy();
    };
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
          <Route path="/interest" element={<InterestPage />} />
          <Route path="/dashboard" element={<h1>sdsdeeee</h1>} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfigProvider>
  );
};

export default App;