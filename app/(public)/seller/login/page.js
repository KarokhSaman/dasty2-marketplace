"use client";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { IRAQ_CITIES } from "@/lib/cities";
import CustomSelect from "@/components/ui/CustomSelect";

// ── Fee tiers (mirrors lib/utils.js calculateProfit) ──────
const FEE_TIERS = [
  { range: "5,000 – 9,000",       fee: "2,000" },
  { range: "10,000 – 29,000",     fee: "3,000" },
  { range: "30,000 – 49,000",     fee: "4,000" },
  { range: "50,000 – 99,000",     fee: "5,000" },
  { range: "100,000 – 199,000",   fee: "10,000" },
  { range: "200,000 – 299,000",   fee: "15,000" },
  { range: "300,000 – 399,000",   fee: "20,000" },
  { range: "400,000 – 499,000",   fee: "25,000" },
  { range: "500,000 – 1,000,000", fee: "30,000" },
];

const STEP_ICONS = [
  <svg key="1" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  <svg key="2" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  <svg key="3" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>,
  <svg key="4" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
];

// ── Error box ─────────────────────────────────────────────
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

// ── Info panel (left column) ──────────────────────────────
function InfoPanel() {
  const { t } = useT();
  const [showFees, setShowFees] = useState(false);

  const steps = [
    { icon: STEP_ICONS[0], title: t.loginStep1T, desc: t.loginStep1D },
    { icon: STEP_ICONS[1], title: t.loginStep2T, desc: t.loginStep2D },
    { icon: STEP_ICONS[2], title: t.loginStep3T, desc: t.loginStep3D },
    { icon: STEP_ICONS[3], title: t.loginStep4T, desc: t.loginStep4D },
  ];

  return (
    <div className="bg-gradient-to-br from-rose-700 via-rose-600 to-rose-500 lg:min-h-screen flex flex-col justify-center px-8 py-10 lg:py-16 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 end-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 pointer-events-none" />
      <div className="absolute bottom-0 start-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24 pointer-events-none" />

      {/* Brand */}
      <div className="relative mb-8">
        <div dir="ltr" className="flex items-center gap-2 mb-4">
          <span className="text-2xl font-bold text-white tracking-tight">Dasty2</span>
          <span className="text-2xl font-medium text-rose-200">Mndalan</span>
        </div>
        <h2 className="text-3xl font-bold text-white leading-tight">{t.loginHeroTitle}</h2>
        <p className="text-rose-200 mt-3 text-sm leading-relaxed">{t.loginHeroSub}</p>
      </div>

      {/* How it works */}
      <div className="relative mb-8">
        <p className="text-xs font-semibold text-rose-300 uppercase tracking-widest mb-4">{t.loginHowLabel}</p>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 mt-0.5">
                {step.icon}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{step.title}</p>
                <p className="text-rose-200 text-xs mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service fees */}
      <div className="relative">
        <button
          onClick={() => setShowFees(v => !v)}
          className="flex items-center gap-2 w-full text-start mb-3 group"
        >
          <p className="text-xs font-semibold text-rose-300 uppercase tracking-widest">{t.loginFeesSec}</p>
          <svg
            className={`w-3.5 h-3.5 text-rose-300 transition-transform duration-200 ${showFees ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Fee summary (always visible) */}
        <div className="bg-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white text-sm font-semibold">{t.loginFeesTitle}</p>
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">IQD</span>
          </div>

          {/* Always-visible highlights */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-rose-200 text-[10px] font-medium mb-1">{t.loginFeesUpTo9k}</p>
              <p className="text-white font-bold text-base">2,000</p>
              <p className="text-rose-300 text-[10px]">{t.loginFeesIqdFee}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-rose-200 text-[10px] font-medium mb-1">{t.loginFeesUpTo99k}</p>
              <p className="text-white font-bold text-base">5,000</p>
              <p className="text-rose-300 text-[10px]">{t.loginFeesIqdFee}</p>
            </div>
          </div>

          {/* Expandable full table */}
          {showFees && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="space-y-1.5">
                {FEE_TIERS.map((tier, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-rose-200 font-mono">{tier.range}</span>
                    <span className="text-white font-bold">{tier.fee} IQD</span>
                  </div>
                ))}
              </div>
              <p className="text-rose-300 text-[10px] mt-3 leading-relaxed">{t.loginFeesNote}</p>
            </div>
          )}

          {!showFees && (
            <button onClick={() => setShowFees(true)} className="text-[10px] text-rose-300 hover:text-white transition-colors underline">
              {t.loginFeesViewFull}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function SellerLoginPage() {
  const { t } = useT();
  const [step, setStep]       = useState("email");
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState("");
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [city, setCity]       = useState("Erbil");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch("/api/seller/me").then(r => r.json()).then(d => {
      if (d.sellerId) window.location.href = "/seller";
    });
  }, []);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/seller/send-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) { setError(t.errorGeneral); return; }
    setStep("otp");
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/seller/verify-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? t.errorInvalidCode); return; }
    if (data.needsProfile) { setStep("profile"); return; }
    window.location.href = "/seller";
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/seller/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, phone, city, address }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? t.errorGeneral); return; }
    window.location.href = "/seller";
  }

  const stepIdx = ["email", "otp", "profile"].indexOf(step);

  const stepMeta = {
    email:   { title: t.loginTitle,       sub: t.loginSubtitle },
    otp:     { title: t.otpLabel,         sub: t.otpSent(email) },
    profile: { title: t.profileStepTitle, sub: t.profileStepSubtitle },
  };

  return (
    <div className="-mx-4 -my-6 lg:grid lg:grid-cols-2 lg:min-h-[calc(100vh-56px)]">

      {/* ── Left: info panel ── */}
      <InfoPanel />

      {/* ── Right: login form ── */}
      <div className="flex items-center justify-center px-6 py-10 bg-gray-50">
        <div className="w-full max-w-sm">

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-7">
            {["email", "otp", "profile"].map((s, i) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${i <= stepIdx ? "bg-rose-500 w-6" : "bg-gray-200 w-3"}`} />
            ))}
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{stepMeta[step].title}</h1>
            <p className="text-sm text-gray-500 mb-6">{stepMeta[step].sub}</p>

            {/* Email step */}
            {step === "email" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t.loginEmailLabel} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder={t.loginEmailPlaceholder} required dir="ltr"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pe-9 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                    {email && (
                      <button type="button" onClick={() => setEmail("")}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {error && <ErrorBox message={error} />}
                <button type="submit" disabled={loading || !email.trim()}
                  className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
                  {loading ? "..." : t.sendCodeBtn}
                </button>
                <p className="text-center text-xs text-gray-400">{t.loginHasAccount}</p>
              </form>
            )}

            {/* OTP step */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t.otpLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text" inputMode="numeric"
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
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

            {/* Profile step */}
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
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <p className="text-[11px] text-gray-400">Use a number with WhatsApp — buyers will contact you through it</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t.registerCityLabel}
                  </label>
                  <CustomSelect
                    value={city}
                    onChange={setCity}
                    options={IRAQ_CITIES.map(c => ({ value: c, label: c }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t.registerAddressLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                    placeholder={t.registerAddressPlaceholder} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                </div>
                {error && <ErrorBox message={error} />}
                <button type="submit" disabled={loading || !name.trim() || !phone.trim() || !address.trim()}
                  className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
                  {loading ? "..." : t.continueBtn}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">{t.loginTermsNote}</p>
        </div>
      </div>
    </div>
  );
}
