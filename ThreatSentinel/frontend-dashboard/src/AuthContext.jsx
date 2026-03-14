// /frontend-dashboard/src/AuthContext.jsx - DEFINITIVE, FINAL, AND SECURE VERSION

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

// Centralized API Configuration
const AUTH_API_URL = "http://localhost:8001"; // URL for auth-service
const API_URL = "http://localhost:8000"; // URL for intake-service

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("aegis_token"));
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // On initial app load, check for an existing valid token in localStorage
  useEffect(() => {
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        if (decodedUser.exp * 1000 > Date.now()) {
          setUser(decodedUser);
        } else {
          localStorage.removeItem("aegis_token");
          setToken(null);
        }
      } catch (error) {
        console.error("Invalid token found, clearing storage:", error);
        localStorage.removeItem("aegis_token");
        setToken(null);
      }
    }
  }, [token]);

  const login = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!response.ok) throw new Error("Login Failed");

    const data = await response.json();
    const decodedUser = jwtDecode(data.access_token);

    // --- THIS IS THE CRITICAL SECURITY FIX ---
    // Before granting access, we must check the user's role.
    if (decodedUser.role !== "ADMIN" && decodedUser.role !== "ANALYST") {
      // If they are a regular 'USER', reject the login attempt for this dashboard.
      throw new Error(
        "Access Denied: This portal is for authorized analysts only."
      );
    }
    // --- END OF SECURITY FIX ---

    localStorage.setItem("aegis_token", data.access_token);
    setToken(data.access_token);
    setUser(decodedUser);

    // This navigation logic is now safe because we've already verified the role.
    if (decodedUser.role === "ADMIN") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem("aegis_token");
    setToken(null);
    setUser(null);
    navigate("/");
  }, [navigate]);

  const callApi = useCallback(
    async (endpoint, options = {}, asBlob = false) => {
      if (!token) throw new Error("Unauthorized");
      const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...options.headers,
      };
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
      if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Unauthorized");
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP Error: ${response.status}`);
      }
      if (asBlob) {
        return response.blob();
      }
      if (
        response.headers.get("Content-Length") === "0" ||
        response.status === 204
      ) {
        return null;
      }
      return response.json();
    },
    [token, logout]
  );

  const callAdminApi = useCallback(
    async (endpoint, method, body) => {
      if (!token) throw new Error("Unauthorized");
      const response = await fetch(`${AUTH_API_URL}${endpoint}`, {
        method: method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Unauthorized or Forbidden");
      }
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Admin API request failed");
      }
      return response.json();
    },
    [token, logout]
  );

  return (
    <AuthContext.Provider
      value={{ token, user, login, logout, callApi, callAdminApi }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
