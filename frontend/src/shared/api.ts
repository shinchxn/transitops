// File: frontend/src/shared/api.ts
// Single Axios instance — Agents B/C/D import this rather than creating
// their own axios.create() call, so the 401 handling and base config
// stays in one place.
import axios from "axios";

const API_ORIGIN = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true, // sends the httpOnly transitops_token cookie
});

// Registered by AuthContext on mount so the interceptor can clear
// in-memory user state without importing React context logic here.
let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isInitialMeCheck = error?.config?.url?.includes("/auth/me");
    if (status === 401) {
      onUnauthorized?.();
      // Don't redirect on the initial /auth/me check on first paint —
      // that's the expected 401 for a logged-out visitor, not a session
      // that just expired mid-use.
      if (!isInitialMeCheck && window.location.pathname !== "/login") {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(error);
  }
);
