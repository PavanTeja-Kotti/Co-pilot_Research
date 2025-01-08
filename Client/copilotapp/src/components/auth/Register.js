import React, { useState } from "react";
import { useAuth } from "../../utils/auth";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        try {
            await register(
                formData.email,
                formData.username,
                formData.password,
                formData.confirmPassword,
                formData.first_name,
                formData.last_name
            );
            navigate("/");
        } catch (err) {
            setError(err.message || "Registration failed");
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
                    maxWidth: "500px",
                    backgroundColor: "#ffffff",
                    padding: "24px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e0e0e0",
                }}
            >
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#333" }}>
                        Create your account
                    </h2>
                    <p style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
                        Or{" "}
                        <Link to="/login" style={{ color: "#1890ff", fontWeight: "500" }}>
                            sign in to an existing account
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
                    {["first_name", "last_name", "email", "username", "password", "confirmPassword"].map((field) => (
                        <div key={field} style={{ marginBottom: "16px" }}>
                            <label
                                htmlFor={field}
                                style={{
                                    display: "block",
                                    marginBottom: "8px",
                                    fontSize: "14px",
                                    color: "#333",
                                    textTransform: "capitalize",
                                }}
                            >
                                {field.replace("_", " ")}
                            </label>
                            <input
                                id={field}
                                name={field}
                                type={field === "password" || field === "confirmPassword" ? "password" : "text"}
                                required
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "14px",
                                    borderRadius: "4px",
                                    border: "1px solid #d9d9d9",
                                    outline: "none",
                                    boxSizing: "border-box", // Ensures proper padding
                                }}
                                placeholder={field.replace("_", " ")}
                                value={formData[field]}
                                onChange={handleChange}
                            />
                        </div>
                    ))}

                    <button
                        type="submit"
                        style={{
                            width: "100%",
                            padding: "10px",
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#ffffff",
                            backgroundColor: "#1890ff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            transition: "background-color 0.3s",
                        }}
                        onMouseOver={(e) => (e.target.style.backgroundColor = "#40a9ff")}
                        onMouseOut={(e) => (e.target.style.backgroundColor = "#1890ff")}
                    >
                        Create Account
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Register;
