import axios from "axios";

// Base axios instance — all API calls go through this
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* Being blocked mid-session is the one 403 that ends the session rather than
   closing a door: every later request would fail the same way, so the stored
   token is dropped and the page restarts at the login screen with the reason.
   Ordinary "not your section" 403s are left for the caller to handle. */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 403 && error.response.data?.code === "ACCOUNT_BLOCKED") {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch { /* storage can be blocked; the redirect still signs them out */ }
      if (!window.location.pathname.startsWith("/login")) {
        window.location.replace("/login?blocked=1");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
