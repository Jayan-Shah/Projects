// /frontend-dashboard/src/App.jsx - DEFINITIVE FINAL VERSION

import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import IncidentDashboard from "./IncidentDashboard";
import LoginPage from "./LoginPage";
import AdminPage from "./AdminPage";
import ClosedIncidentsPage from "./ClosedIncidentsPage";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/" replace />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === "ADMIN" ? (
    children
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

function App() {
  const { token } = useAuth();

  return (
    <div className="App">
      <Routes>
        {/* If not logged in, show the login page. If logged in, redirect to the dashboard. */}
        <Route
          path="/"
          element={
            !token ? <LoginPage /> : <Navigate to="/dashboard" replace />
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <IncidentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/closed-incidents"
          element={
            <ProtectedRoute>
              <ClosedIncidentsPage />
            </ProtectedRoute>
          }
        />

        {/* Any unknown route redirects to the main page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
