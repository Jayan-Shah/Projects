// /user-portal/src/App.jsx (FINAL VERSION)

import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import "./App.css";
import { useAuth } from "./AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SubmissionPage from "./pages/SubmissionPage";
import MyIncidentsPage from "./pages/MyIncidentsPage";
import LiveNewsPage from "./pages/LiveNewsPage"; // 1. IMPORT THE NEW PAGE

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/" replace />;
};

function App() {
  const { token, user, logout } = useAuth();

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-brand">
          <h1>Threat Sentinel</h1>
          <p>Cyber Incident & Safety Portal</p>
        </div>
        {token && (
          <div className="header-nav">
            <span className="user-info">
              Welcome, <strong>{user?.sub}</strong>
            </span>
            <nav>
              <NavLink to="/submit">Submit Incident</NavLink>
              <NavLink to="/my-incidents">My Incidents</NavLink>
              {/* 2. ADD THE NEW NAVIGATION LINK */}
              <NavLink to="/live-news">Live News</NavLink>
            </nav>
            <button onClick={logout} className="logout-button">
              Logout
            </button>
          </div>
        )}
      </header>
      <main>
        <Routes>
          <Route
            path="/"
            element={!token ? <LoginPage /> : <Navigate to="/submit" replace />}
          />
          <Route
            path="/register"
            element={
              !token ? <RegisterPage /> : <Navigate to="/submit" replace />
            }
          />
          <Route
            path="/submit"
            element={
              <ProtectedRoute>
                <SubmissionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-incidents"
            element={
              <ProtectedRoute>
                <MyIncidentsPage />
              </ProtectedRoute>
            }
          />

          {/* 3. ADD THE NEW ROUTE FOR THE NEWS PAGE */}
          <Route
            path="/live-news"
            element={
              <ProtectedRoute>
                <LiveNewsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
