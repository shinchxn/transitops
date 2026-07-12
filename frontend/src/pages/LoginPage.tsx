// File: frontend/src/pages/LoginPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../shared/api";
import { useAuth, User } from "../shared/AuthContext";
import axios from "axios";

export default function LoginPage() {
  const [email, setEmail] = useState("manager@transitops.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
      login(res.data.user);
      navigate("/");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const d = err.response.data as ApiError;
        setError(d.message || "Failed to log in.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to TransitOps</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Enter your credentials to continue</p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label className="sr-only">Email address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address" />
            </div>
            <div>
              <label className="sr-only">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password" />
            </div>
          </div>
          <div>
            <button type="submit" disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
