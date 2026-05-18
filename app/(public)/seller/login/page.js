"use client";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { IRAQ_CITIES } from "@/lib/cities";

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

export default function SellerLoginPage() {
  const { t } = useT();
  const [step, setStep]     = useState("email");  // email | otp | profile
  const [email, setEmail]   = useState("");
  const [otp, setOtp]       = useState("");
  const [name, setName]     = useState("");
  const [phone, setPhone]   = useState("");
  const [city, setCity]     = useState("Erbil");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  // Already logged in?
  useEffect(() => {
    fetch("/api/seller/me").then(r => r.json()).then(d => {
      if (d.sellerId) window.location.href = "/seller";
    });
  }, []);

  // ── Step 1: send OTP ──────────────────────────────────────
  async function handleSendOtp(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/seller/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) { setError(t.errorGeneral); return; }
    setStep("otp");
  }

  // ── Step 2: verify OTP ────────────────────────────────────
  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/seller/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? t.errorInvalidCode); return; }
    if (data.needsProfile) { setStep("profile"); return; }
    window.location.href = "/seller";
  }

  // ── Step 3: complete profile (new sellers) ────────────────
  async function handleRegister(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/seller/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, phone, city }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? t.errorGeneral); return; }
    window.location.href = "/seller";
  }

  const icons = {
    email: (
      <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
      </svg>
    ),
    otp: (
      <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    profile: (
      <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  };

  const titles = {
    email:   { title: t.loginTitle,       sub: t.loginSubtitle },
    otp:     { title: t.otpLabel,         sub: t.otpSent(email) },
    profile: { title: t.profileStepTitle, sub: t.profileStepSubtitle },
  };

  const stepIdx = ["email","otp","profile"].indexOf(step);

  return (
    <div className="flex items-center justify-center min-h-[75vh]">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-md">
        {/* Icon + title */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
            {icons[step]}
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center">{titles[step].title}</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">{titles[step].sub}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {["email","otp","profile"].map((s, i) => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${i <= stepIdx ? "bg-rose-500 w-6" : "bg-gray-200 w-3"}`} />
          ))}
        </div>

        {/* ── Email form ── */}
        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.loginEmailLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={t.loginEmailPlaceholder} required dir="ltr"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            {error && <ErrorBox message={error} />}
            <button type="submit" disabled={loading || !email.trim()}
              className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
              {loading ? "..." : t.sendCodeBtn}
            </button>
          </form>
        )}

        {/* ── OTP form ── */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.otpLabel} <span className="text-rose-500">*</span>
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
              {loading ? "..." : t.verifyBtn}
            </button>
            <div className="flex justify-between text-xs text-gray-400">
              <button type="button" onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                className="hover:text-rose-600 transition-colors">← {t.backToPhone}</button>
              <button type="button" onClick={() => { setOtp(""); handleSendOtp({ preventDefault: () => {} }); }}
                className="hover:text-rose-600 transition-colors">{t.resendCode}</button>
            </div>
          </form>
        )}

        {/* ── Profile form ── */}
        {step === "profile" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.registerNameLabel} <span className="text-rose-500">*</span>
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder={t.registerNamePlaceholder} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.loginPhoneLabel} <span className="text-rose-500">*</span>
              </label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder={t.loginPhonePlaceholder} required dir="ltr"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.registerCityLabel}
              </label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                {IRAQ_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {error && <ErrorBox message={error} />}
            <button type="submit" disabled={loading || !name.trim() || !phone.trim()}
              className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
              {loading ? "..." : t.continueBtn}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
