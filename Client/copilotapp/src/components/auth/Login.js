import React, { useState, useEffect } from "react";
import { useAuth } from "../../utils/auth";
import { useLocation, useNavigate, Link } from "react-router-dom";

const Login = () => {
  const { login, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  // Handle successful login redirect
  useEffect(() => {
    if (user) {
      const returnTo = location.state?.returnTo || "/";
      navigate(returnTo, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(formData.email, formData.password);
      // Navigation is handled by the useEffect above
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f0f2f5",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#ffffff",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e0e0e0",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: "700",
              color: "#333",
            }}
          >
            Sign in to your account
          </h2>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
            Or{" "}
            <Link
              to="/register"
              style={{ color: "#1890ff", fontWeight: "500" }}
            >
              create a new account
            </Link>
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              backgroundColor: "#fdecea",
              border: "1px solid #f5c6cb",
              borderRadius: "4px",
              color: "#721c24",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#333",
              }}
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                borderRadius: "4px",
                border: "1px solid #d9d9d9",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#333",
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                borderRadius: "4px",
                border: "1px solid #d9d9d9",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              fontWeight: "600",
              color: "#fff",
              backgroundColor: "#1890ff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#40a9ff")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#1890ff")}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
