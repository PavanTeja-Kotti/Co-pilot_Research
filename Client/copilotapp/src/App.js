import SessionErrorBanner from "./components/common/SessionErrorBanner";
import PrivateRoute from "./components/common/PrivateRoute";
import { useAuth } from "./utils/auth";
import { AuthProvider } from "./utils/auth";
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route,  } from "react-router-dom";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import AuthWrapper from "./utils/AuthWrapper";
import { Navigate } from "react-router-dom";
import Homepage from "./Homepage";

const PublicRoute = ({ children }) => {
  const { user } = useAuth();

  // If user is authenticated, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthWrapper>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Homepage />
            </PrivateRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthWrapper>
  );
}

export default App;
