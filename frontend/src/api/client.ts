import axios from "axios";

// A missing VITE_API_URL used to produce requests such as `undefined/api/auth/me`.
// On Vercel those requests are rewritten to the SPA and can leave a restored session
// waiting for an API response that will never be valid.
const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const API_BASE_URL = configuredApiUrl ? `${configuredApiUrl}/api` : "/api";

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
