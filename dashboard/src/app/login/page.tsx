"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { iamFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await iamFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error?.message || data?.error || "Login failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm border rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-4">QBridge Dashboard Login</h1>

        {err && <div className="mb-3 text-sm text-red-500">{err}</div>}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-sm">Email</label>
            <input
              className="w-full border rounded p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm">Password</label>
            <input
              className="w-full border rounded p-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            className="w-full border rounded p-2"
            disabled={loading}
            type="submit"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
