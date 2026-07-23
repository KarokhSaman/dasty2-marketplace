import { useState } from "react";

export default function MockLoginButton({ role }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!import.meta.env.DEV) return null;

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/mock-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error("mock_login_failed");
      window.location.href = role === "admin" ? "/admin" : "/seller";
    } catch {
      setError("Mock login is unavailable. Check the development backend setup.");
      setLoading(false);
    }
  }

  const label = role === "admin" ? "Continue as mock admin" : "Continue as mock seller";

  return (
    <div className="mt-3 border-t border-dashed border-[var(--color-hairline)] pt-3 sm:mt-4 sm:pt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-[var(--color-ink)]">Development access</p>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
          Local only
        </span>
      </div>
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="flex h-9 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60 sm:h-10 sm:text-sm"
      >
        {loading ? "Signing in…" : label}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
