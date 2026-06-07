"use client";

import { useState } from "react";

export function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (response.ok) {
      window.location.href = "/admin";
      return;
    }

    const json = await response.json();
    setError(json?.message || "Invalid password");
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/80 p-8 shadow-2xl shadow-black/40">
      <h1 className="mb-4 text-2xl font-semibold text-white">Admin login</h1>
      <p className="mb-6 text-slate-400">Enter your dashboard password to view private reports and settings.</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm font-medium text-slate-300">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            required
          />
        </label>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Checking…" : "Unlock dashboard"}
        </button>
      </form>
    </div>
  );
}
