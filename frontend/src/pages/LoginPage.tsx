import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Ambient background styling */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.15),_transparent_60%)]" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-purple-400/15 blur-3xl animate-pulse"
          style={{ animationDelay: "3s" }}
        />
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="font-heading font-extrabold text-4xl tracking-tight text-gray-900">
            Transit<span className="text-gradient">Ops</span>
          </div>
          <p className="mt-2 text-sm text-gray-500 font-medium">Fleet Management. Digitized.</p>
        </motion.div>

        <div className="glass-panel rounded-2xl p-8">
          <h2 className="text-center text-xl font-semibold text-gray-800">Sign in to your account</h2>
          <p className="mt-1 text-center text-sm text-gray-500">Enter your credentials to continue</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-5 bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200"
            >
              {error}
            </motion.div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/50 border border-gray-300 text-gray-900 placeholder-gray-400 text-sm outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/50 border border-gray-300 text-gray-900 placeholder-gray-400 text-sm outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Password"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.015 }}
              whileTap={{ scale: loading ? 1 : 0.985 }}
              className="relative mt-2 w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden transition-all"
            >
              {loading && (
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              {loading ? "Signing in..." : "Sign in"}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
