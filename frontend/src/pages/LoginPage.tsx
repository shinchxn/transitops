// File: frontend/src/pages/LoginPage.tsx
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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-navy-950 py-12 px-4 sm:px-6 lg:px-8">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(24,54,168,0.35),_transparent_60%)]" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-600/20 blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-brand-500/10 blur-3xl animate-pulse"
          style={{ animationDelay: "3s" }}
        />
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:48px_48px]" />
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
          <div className="text-4xl font-extrabold tracking-tight">
            <span className="text-white">Transit</span>
            <span className="text-brand-400">Ops</span>
          </div>
          <p className="mt-2 text-sm text-gray-400">Fleet Management. Digitized.</p>
        </motion.div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/40">
          <div className="p-8">
            <h2 className="text-center text-xl font-semibold text-white">Sign in to your account</h2>
            <p className="mt-1 text-center text-sm text-gray-400">Enter your credentials to continue</p>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-5 bg-red-500/10 text-red-300 text-sm p-3 rounded-lg border border-red-500/30"
              >
                {error}
              </motion.div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="sr-only">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label className="sr-only">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30"
                  placeholder="Password"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.015 }}
                whileTap={{ scale: loading ? 1 : 0.985 }}
                className="relative w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-400 shadow-lg shadow-brand-500/20 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
              >
                {loading && (
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {loading ? "Signing in..." : "Sign in"}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
