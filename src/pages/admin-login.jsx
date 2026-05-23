import { useState, useEffect } from "react";
import * as m from "@/src/paraglide/messages";
import { translateError } from "@/src/lib/translateError";

function ErrorBox({ message }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
      <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}

export default function AdminLoginPage() {
  const [step,    setStep]    = useState("email");
  const [email,   setEmail]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.json()).then(d => {
      if (d.email) window.location.href = "/admin";
    });
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/admin/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(translateError(data.error));
      return;
    }
    setStep("otp");
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/admin/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(translateError(data.error));
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <div className="flex items-center justify-center min-h-[75vh]">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-sm">
        {/* Icon */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{m.adminLoginTitle()}</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            {step === "email" ? m.adminEnterEmail() : m.otpSent({ phone: email })}
          </p>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-6">
          {["email","otp"].map((s, i) => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${i <= ["email","otp"].indexOf(step) ? "bg-rose-500 w-6" : "bg-gray-200 w-3"}`} />
          ))}
        </div>

        {step === "email" ? (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {m.loginEmailLabel()} <span className="text-rose-500">*</span>
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com" required dir="ltr"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            {error && <ErrorBox message={error} />}
            <button type="submit" disabled={loading || !email.trim()}
              className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
              {loading ? "..." : m.sendCodeBtn()}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {m.otpLabel()} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text" inputMode="numeric"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
                placeholder="000000" maxLength={6} dir="ltr"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm tracking-[0.4em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            {error && <ErrorBox message={error} />}
            <button type="submit" disabled={loading || otp.length !== 6}
              className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
              {loading ? "..." : m.verifyBtn()}
            </button>
            <div className="flex justify-between text-xs text-gray-400">
              <button type="button" onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                className="hover:text-rose-600 transition-colors">← {m.backToPhone()}</button>
              <button type="button" onClick={() => handleSend({ preventDefault: () => {} })}
                className="hover:text-rose-600 transition-colors">{m.resendCode()}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
