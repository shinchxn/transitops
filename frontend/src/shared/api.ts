// File: frontend/src/shared/api.ts
// API client — wraps fetch for convenient CRUD operations with auth.

const API_BASE = (import.meta.env as any).VITE_API_URL || "http://localhost:4000/api";

export const api = {
  async get(url: string, options?: { params?: Record<string, any> }) {
    const query = options?.params
      ? "?" + new URLSearchParams(options.params as any).toString()
      : "";
    const res = await fetch(`${API_BASE}${url}${query}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        // For testing: include mock auth headers
        "x-user-id": localStorage.getItem("userId") || "test-user",
        "x-user-email": localStorage.getItem("userEmail") || "test@example.com",
        "x-user-role": localStorage.getItem("userRole") || "FLEET_MANAGER",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async post(url: string, data?: any) {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": localStorage.getItem("userId") || "test-user",
        "x-user-email": localStorage.getItem("userEmail") || "test@example.com",
        "x-user-role": localStorage.getItem("userRole") || "FLEET_MANAGER",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw error;
    }
    return res.json();
  },

  async patch(url: string, data?: any) {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": localStorage.getItem("userId") || "test-user",
        "x-user-email": localStorage.getItem("userEmail") || "test@example.com",
        "x-user-role": localStorage.getItem("userRole") || "FLEET_MANAGER",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw error;
    }
    return res.json();
  },
};
