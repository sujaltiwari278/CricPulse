import axios from "axios";

// Vercel does not receive local .env values automatically. Keep the production
// API as a fallback while still allowing every deployment to override it.
const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "https://cricpulse-cjmr.onrender.com";
const API_BASE_URL = `${configuredApiUrl}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Never make initial rendering depend on an unreachable or cold backend.
  timeout: 8000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("cricpulse_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Export both ways so existing imports remain compatible.
// AuthContext.tsx currently uses: import api from "../api/client";
export { api };
export default api;
