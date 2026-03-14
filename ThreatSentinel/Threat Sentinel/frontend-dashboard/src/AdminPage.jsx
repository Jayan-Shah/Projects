import React from "react";
import AdminPanel from "./AdminPanel";
import { useAuth } from "./AuthContext";
import { Link } from "react-router-dom";

const AdminPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="page-container">
      {/* This header uses the 'page-header' class for specific styling */}
      <header className="page-header">
        <h1>Threat Sentinel - Admin Panel</h1>
        <div className="header-controls">
          <span className="user-info">
            User: <strong>{user?.sub}</strong> ({user?.role})
          </span>
          <Link to="/dashboard" className="nav-link">
            View Dashboard
          </Link>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      <main className="page-main-content">
        <AdminPanel />
      </main>
    </div>
  );
};

export default AdminPage;
