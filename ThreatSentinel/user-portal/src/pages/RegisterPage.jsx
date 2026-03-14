// /user-portal/src/pages/RegisterPage.jsx

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const AUTH_API_URL = "http://localhost:8001";

const RegisterPage = () => {
  const [username, setUsername] = useState(""); // This is the Service ID
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${AUTH_API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Registration failed.");
      }

      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => navigate("/"), 2000); // Redirect to login after 2s
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="form-container">
      <h2>Personnel Registration</h2>
      <p>
        If your Service ID is authorized, you may register for an account here.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">
            Service ID (This will be your username)
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Create Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
        <button type="submit" className="form-button">
          Register Account
        </button>
      </form>
      <p className="sub-link">
        Already have an account? <Link to="/">Login Here</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
