// /user-portal/src/AuthContext.jsx (DEFINITIVE, FINAL, AND SECURE VERSION)

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

const AUTH_API_URL = "http://localhost:8001";
const INTAKE_API_URL = "http://localhost:8000";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() =>
    localStorage.getItem("user_aegis_token")
  );
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        if (decodedUser.exp * 1000 > Date.now()) {
          setUser(decodedUser);
        } else {
          localStorage.removeItem("user_aegis_token");
          setToken(null);
        }
      } catch (error) {
        console.error("Invalid token found, clearing storage:", error);
        localStorage.removeItem("user_aegis_token");
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

    if (!response.ok) {
      try {
        const errData = await response.json();
        throw new Error(errData.detail || "Login Failed");
      } catch {
        throw new Error("Login Failed");
      }
    }

    const data = await response.json();
    const decodedUser = jwtDecode(data.access_token);

    // --- THIS IS THE CRITICAL SECURITY FIX ---
    // This portal is ONLY for end-users. We must explicitly check the role.
    if (decodedUser.role !== "USER") {
      throw new Error(
        "Access Denied: Admins and Analysts must use the CERT Command Dashboard."
      );
    }
    // --- END OF SECURITY FIX ---

    localStorage.setItem("user_aegis_token", data.access_token);
    setToken(data.access_token);
    setUser(decodedUser);
    navigate("/submit");
  };

  const logout = useCallback(() => {
    localStorage.removeItem("user_aegis_token");
    setToken(null);
    setUser(null);
    navigate("/");
  }, [navigate]);

  const callApi = useCallback(async (endpoint, options = {}) => {
      if (!token) throw new Error("Authentication token not found.");
      // ... (rest of function is unchanged)
  }, [token, logout]);
    
  const callApiWithFile = useCallback(async (endpoint, method, formData) => {
      if (!token) throw new Error("Authentication token not found.");
      // ... (rest of function is unchanged)
  }, [token, logout]);

  // Make sure the full functions are here
  const fullCallApi = useCallback(
    async (endpoint, options = {}) => {
      if (!token) throw new Error("Authentication token not found.");

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      };

      const response = await fetch(`${INTAKE_API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        logout();
        throw new Error("Your session has expired. Please log in again.");
      }
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.detail || `An API error occurred.`);
        } catch (e) {
          throw new Error(e.message || `HTTP Error: ${response.status}`);
        }
      }
      if (response.status === 204) return null;
      return response.json();
    },
    [token, logout]
  );

  const fullCallApiWithFile = useCallback(
    async (endpoint, method, formData) => {
      if (!token) throw new Error("Authentication token not found.");

      const response = await fetch(`${INTAKE_API_URL}${endpoint}`, {
        method: method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 401) {
        logout();
        throw new Error("Your session has expired. Please log in again.");
      }
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.detail || `An API error occurred.`);
        } catch (e) {
          throw new Error(e.message || `File upload failed.`);
        }
      }
      return response.json();
    },
    [token, logout]
  );


  return (
    <AuthContext.Provider
      value={{ token, user, login, logout, callApi: fullCallApi, callApiWithFile: fullCallApiWithFile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);