import { useState } from "react";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { DEFAULT_DIAL_CODE, DIAL_CODES, isPlausiblePhone, toE164 } from "@/lib/phone";

const METHODS = [
  { id: "whatsapp-otp", label: () => m.otpMethodWhatsapp() },
  { id: "telegram-otp", label: () => m.otpMethodTelegram() },
  { id: "sms-otp", label: () => m.otpMethodSms() },
];

function errorFor(code) {
  switch (code) {
    case "OTP_EXPIRED":
      return m.otpErrExpired();
    case "OTP_INVALID":
      return m.errorInvalidCode();
    case "OTP_ALREADY_VERIFIED":
      return m.otpErrAlreadyVerified();
    default:
      return m.errorGeneral();
  }
}

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
      <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}

// Two-step phone → OTP login shared by seller and admin. Calls the /api/auth
// routes, then hands the verified role back to the caller for navigation.
export default function OtpLogin({ onVerified }) {
  const [step, setStep] = useState("phone"); // phone | otp
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE);
  const [local, setLocal] = useState("");
  const [method, setMethod] = useState("whatsapp-otp");
  const [showMethods, setShowMethods] = useState(false);
  const [verificationKey, setVerificationKey] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const e164 = toE164(dialCode, local);

  async function sendOtp(chosenMethod) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          methodName: chosenMethod,
          phoneNumber: e164,
          language: getLocale(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.verificationKey) {
        setError(m.errorGeneral());
        setLoading(false);
        return;
      }
      setMethod(chosenMethod);
      setVerificationKey(data.verificationKey);
      setCode("");
      setStep("otp");
    } catch {
      setError(m.errorGeneral());
    }
    setLoading(false);
  }

  async function handleSendSubmit(e) {
    e.preventDefault();
    if (!isPlausiblePhone(dialCode, local)) {
      setError(m.errorGeneral());
      return;
    }
    await sendOtp(method);
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim(), verificationKey }),
      });
      const data = await res.json();
      if (data.ok) {
        // Caller navigates on success. It may instead return { error } to reject
        // (e.g. admin login given a non-admin phone) — then we surface it here.
        const result = await onVerified?.(data.role);
        if (result && result.error) {
          setError(result.error);
          setLoading(false);
        }
        return;
      }
      setError(errorFor(data.errorCode));
    } catch {
      setError(m.errorGeneral());
    }
    setLoading(false);
  }

  const inputCls =
    "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition";

  if (step === "otp") {
    return (
      <form onSubmit={handleVerify} className="space-y-4">
        <p className="text-sm text-[var(--color-ink-soft)]">{m.otpSent({ phone: e164 })}</p>
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">{m.otpLabel()}</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder={m.otpPlaceholder()}
            required
            dir="ltr"
            className={`${inputCls} text-center tracking-[0.3em] text-lg`}
          />
        </div>
        <ErrorBox message={error} />
        <button
          type="submit"
          disabled={loading || code.trim().length < 4}
          className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50"
        >
          {loading ? "..." : m.verifyBtn()}
        </button>

        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={() => { setStep("phone"); setError(""); }} className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] underline underline-offset-4">
            {m.backToPhone()}
          </button>
          <button type="button" disabled={loading} onClick={() => sendOtp(method)} className="text-[var(--color-ember-600)] hover:text-[var(--color-ember-700)] underline underline-offset-4 disabled:opacity-50">
            {m.resendCode()}
          </button>
        </div>

        <div className="pt-2 border-t border-[var(--color-hairline)]">
          <p className="text-[11px] text-[var(--color-ink-fade)] mb-2">{m.otpTryAnother()}</p>
          <div className="flex flex-wrap gap-2">
            {METHODS.filter((mm) => mm.id !== method).map((mm) => (
              <button
                key={mm.id}
                type="button"
                disabled={loading}
                onClick={() => sendOtp(mm.id)}
                className="rounded-full border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition-colors disabled:opacity-50"
              >
                {mm.label()}
              </button>
            ))}
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {m.loginPhoneLabel()} <span className="text-rose-500">*</span>
        </label>
        <div className="flex gap-2" dir="ltr">
          <select
            value={dialCode}
            onChange={(e) => setDialCode(e.target.value)}
            className="rounded-xl border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ember-300)]"
          >
            {DIAL_CODES.map((d) => (
              <option key={d.code} value={d.code}>{d.label}</option>
            ))}
          </select>
          <input
            type="tel"
            inputMode="numeric"
            value={local}
            onChange={(e) => setLocal(e.target.value.replace(/\D/g, ""))}
            placeholder={m.loginPhonePlaceholder()}
            required
            className={`${inputCls} flex-1`}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
          </svg>
          <p className="text-[11px] text-[var(--color-ink-fade)]">{m.loginPhoneHint()}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-cream)]/60">
        <button
          type="button"
          aria-expanded={showMethods}
          onClick={() => setShowMethods((value) => !value)}
          className="flex min-h-10 w-full items-center justify-between gap-3 px-3.5 py-2 text-start"
        >
          <span className="text-xs text-[var(--color-ink-soft)]">{m.otpChooseMethod()}</span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ember-600)]">
            {METHODS.find((item) => item.id === method)?.label()}
            <svg className={`h-3.5 w-3.5 transition-transform ${showMethods ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        {showMethods && (
          <div className="grid grid-cols-3 gap-1.5 border-t border-[var(--color-hairline)] p-2">
            {METHODS.map((mm) => (
              <button
                key={mm.id}
                type="button"
                onClick={() => {
                  setMethod(mm.id);
                  setShowMethods(false);
                }}
                className={`rounded-lg px-2 py-2 text-[11px] font-semibold border transition-colors ${
                  method === mm.id
                    ? "bg-white border-[var(--color-ember-300)] text-[var(--color-ember-600)]"
                    : "border-transparent text-[var(--color-ink-soft)] hover:bg-white"
                }`}
              >
                {mm.label()}
              </button>
            ))}
          </div>
        )}
      </div>

      <ErrorBox message={error} />
      <button
        type="submit"
        disabled={loading || !isPlausiblePhone(dialCode, local)}
        className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50"
      >
        {loading ? "..." : m.sendCodeBtn()}
      </button>
    </form>
  );
}
