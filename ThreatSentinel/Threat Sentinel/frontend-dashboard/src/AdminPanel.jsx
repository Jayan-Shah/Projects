import React, { useState } from "react";
import { useAuth } from "./AuthContext";

const AdminPanel = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const { callAdminApi } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    try {
      const newUser = { username, password };
      const createdUser = await callAdminApi(
        "/admin/create-analyst",
        "POST",
        newUser
      );
      setMessage(
        `Success! Created analyst account for: ${createdUser.username}`
      );
      setUsername("");
      setPassword("");
    } catch (err) {
      setMessage(`Error: ${err.message}`);
      setIsError(true);
    }
  };

  return (
    <div className="admin-panel-card">
      <div className="admin-panel-header">
        <h3>Create New Analyst Account</h3>
      </div>
      <div className="admin-panel-body">
        <p>
          Use this form to provision a new account for an authorized CERT
          analyst. They will be created with the 'ANALYST' role.
        </p>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="new-username">Service ID (Username)</label>
            <input
              id="new-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-password">Initial Temporary Password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="admin-button">
            Create Analyst
          </button>
        </form>
        {message && (
          <p
            className={`message ${
              isError ? "error-message" : "success-message"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
