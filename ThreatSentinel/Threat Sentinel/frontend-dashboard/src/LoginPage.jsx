// /frontend-dashboard/src/LoginPage.jsx

import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import armyStatueImage from "./assets/indian-army-statue.jpg";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
    } catch (err) {
      setError("Failed to login. Please check credentials.");
    }
  };

  return (
    // This main container will center everything
    <div className="login-page-container">
      <div className="login-card">
        {/* Left Panel: Image and Branding */}
        <div className="login-image-panel">
          <img src={armyStatueImage} alt="Indian Army Soldiers" />
          <div className="image-overlay">
            <h2>Threat Sentinel</h2>
            <p>Vigilance is the shield of the nation.</p>
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="login-form-panel">
          <div className="form-content">
            <h3>Analyst Authentication</h3>
            <p>Access is restricted to authorized personnel.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="error-message">{error}</p>}
              <button type="submit" className="login-button">
                Login Securely
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
