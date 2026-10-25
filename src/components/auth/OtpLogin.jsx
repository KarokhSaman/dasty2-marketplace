import { useEffect, useRef, useState } from "react";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { DEFAULT_DIAL_CODE, DIAL_CODES, isPlausiblePhone, toE164 } from "@/lib/phone";
import CustomSelect from "@/components/ui/CustomSelect";

const CODE_LENGTH = 6;
// Seconds before the same code can be sent again.
const RESEND_AFTER = 30;
const PHONE_MARK = "\u0000";

function OtpPhoneMessage({ phone }) {
  // The phone sits wherever {phone} is in each language's sentence, in its own
  // LTR span so RTL text doesn't move the + sign.
  // Kurdish writes the + after the digits (9647501234567+).
  const [before, after = ""] = m.otpSent({ phone: PHONE_MARK }).split(PHONE_MARK);
  const shown = getLocale() === "ckb" ? phone.replace(/^\+(.*)$/, "$1+") : phone;
  return (
    <p className="text-sm text-[var(--color-ink-soft)]">
      {before}
      <span dir="ltr" className="font-semibold inline-block">{shown}</span>
      {after}
    </p>
  );
}

// Accept Kurdish/Arabic digits too, stored as 0-9.
function toAsciiDigits(text) {
  return text.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) - 0x0660) % 0x90 % 10));
}

const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.5c-.1.2-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z" />
  </svg>
);
const TelegramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.64 6.8-1.64 7.75c-.12.55-.45.68-.91.42l-2.5-1.84-1.2 1.16c-.13.13-.25.25-.51.25l.18-2.55 4.64-4.19c.2-.18-.04-.28-.31-.1l-5.73 3.61-2.47-.77c-.54-.17-.55-.54.11-.8l9.65-3.72c.45-.17.84.1.69.78Z" />
  </svg>
);
const SmsIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M12 3C6.5 3 2 6.7 2 11.2c0 2.4 1.3 4.6 3.4 6.1L4.6 21l4-2.1c1 .3 2.2.5 3.4.5 5.5 0 10-3.7 10-8.2S17.5 3 12 3Zm-4.5 9.4a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4.5 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4.5 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z" />
  </svg>
);

// Each way to send the code, with its own icon and colours (icon, chosen text,
// chosen background). SMS has no brand colour, so amber keeps it apart.
const METHODS = [
  { id: "whatsapp-otp", label: () => m.otpMethodWhatsapp(), Icon: WhatsAppIcon, color: "#25D366", text: "#128C4A", bg: "#EAF9F0" },
  { id: "telegram-otp", label: () => m.otpMethodTelegram(), Icon: TelegramIcon, color: "#229ED9", text: "#1D7FB0", bg: "#E8F5FC" },
  { id: "sms-otp", label: () => m.otpMethodSms(), Icon: SmsIcon, color: "#F59E0B", text: "#B45309", bg: "#FEF5E6" },
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
// `phoneHint` shows the "buyers contact you on WhatsApp" note (sellers only).
// `methods` limits how the code can be sent (ids from METHODS); with one, the
// choice and the "try another way" row are not shown. Admin login: WhatsApp only.
export default function OtpLogin({ onVerified, phoneHint = true, methods = null }) {
  const allowed = methods ? METHODS.filter((mm) => methods.includes(mm.id)) : METHODS;
  const [step, setStep] = useState("phone"); // phone | otp
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE);
  const [local, setLocal] = useState("");
  const [method, setMethod] = useState(allowed[0].id);
  const [verificationKey, setVerificationKey] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [codeFocused, setCodeFocused] = useState(false);
  const verifying = useRef(false);

  const e164 = toE164(dialCode, local);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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
      if (data.errorCode === "OTP_LIMIT") {
        // Too many codes for this number this hour (checked on the server).
        setError(m.otpTooMany({ minutes: Math.max(1, Math.ceil((data.retryAfterMs ?? 0) / 60000)) }));
        setLoading(false);
        return;
      }
      if (!res.ok || !data.verificationKey) {
        setError(m.errorGeneral());
        setLoading(false);
        return;
      }
      setMethod(chosenMethod);
      setVerificationKey(data.verificationKey);
      setCode("");
      setCooldown(RESEND_AFTER);
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

  function handleVerify(e) {
    e.preventDefault();
    if (code.length === CODE_LENGTH) verify(code);
  }

  // Typing (or pasting / autofilling) the last digit checks the code at once.
  function onCodeChange(value) {
    const next = toAsciiDigits(value).replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(next);
    if (error) setError("");
    if (next.length === CODE_LENGTH) verify(next);
  }

  async function verify(value) {
    if (verifying.current) return;
    verifying.current = true;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: value, verificationKey }),
      });
      const data = await res.json();
      if (data.ok) {
        // Caller navigates on success. It may instead return { error } to reject
        // (e.g. admin login given a non-admin phone) — then we surface it here.
        const result = await onVerified?.(data.role);
        if (result && result.error) {
          setError(result.error);
          setLoading(false);
          verifying.current = false;
        }
        return;
      }
      setError(errorFor(data.errorCode));
    } catch {
      setError(m.errorGeneral());
    }
    setLoading(false);
    verifying.current = false;
  }

  const inputCls =
    "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition";

  if (step === "otp") {
    return (
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <OtpPhoneMessage phone={e164} />
          {/* A typo in the number is one tap to fix. */}
          <button
            type="button"
            onClick={() => { setStep("phone"); setError(""); setCode(""); }}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-ember-50)] px-3 py-1 text-xs font-bold text-[var(--color-ember-600)] hover:bg-[var(--color-ember-100)] transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 8 18l1-4.536z" />
            </svg>
            {m.changeNumber()}
          </button>
        </div>
        <div>
          <label htmlFor="otp-code" className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">{m.otpLabel()}</label>
          {/* Six boxes, one digit each. A single real input sits on top (see-
              through) so typing, paste and the phone's SMS code suggestion all
              work as with one field. */}
          <div className="relative" dir="ltr">
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              onFocus={() => setCodeFocused(true)}
              onBlur={() => setCodeFocused(false)}
              maxLength={CODE_LENGTH}
              className="absolute inset-0 z-10 w-full h-full opacity-0 text-[16px] caret-transparent cursor-text"
            />
            <div className="grid grid-cols-6 gap-2" aria-hidden>
              {Array.from({ length: CODE_LENGTH }, (_, i) => {
                const active = codeFocused && !loading && i === Math.min(code.length, CODE_LENGTH - 1);
                return (
                  <div
                    key={i}
                    className={`h-12 rounded-xl border bg-white grid place-items-center text-xl font-semibold tabular-nums text-[var(--color-ink)] transition ${
                      error
                        ? "border-red-300"
                        : active
                          ? "border-[var(--color-ember-300)] ring-4 ring-[var(--color-ember-100)]/50"
                          : "border-[var(--color-hairline)]"
                    }`}
                  >
                    {code[i] ?? (active ? <span className="w-[1.5px] h-5 bg-[var(--color-ember-500)] animate-pulse" /> : "")}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <ErrorBox message={error} />
        <button
          type="submit"
          disabled={loading || code.trim().length < CODE_LENGTH}
          className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50"
        >
          {loading ? "..." : m.verifyBtn()}
        </button>

        {/* Resend unlocks after a short wait, so a few taps don't send several codes. */}
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            disabled={loading || cooldown > 0}
            onClick={() => sendOtp(method)}
            className="text-[var(--color-ember-600)] hover:text-[var(--color-ember-700)] underline underline-offset-4 disabled:text-[var(--color-ink-fade)] disabled:no-underline"
          >
            {m.resendCode()}
          </button>
          {cooldown > 0 && (
            <span dir="ltr" className="tabular-nums font-semibold text-[var(--color-ink-fade)]">
              0:{String(cooldown).padStart(2, "0")}
            </span>
          )}
        </div>

        {allowed.length > 1 && <div className="pt-2 border-t border-[var(--color-hairline)]">
          <p className="text-[11px] text-[var(--color-ink-fade)] mb-2">{m.otpTryAnother()}</p>
          <div className="flex flex-wrap gap-2">
            {allowed.filter((mm) => mm.id !== method).map((mm) => (
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
        </div>}
      </form>
    );
  }

  const dialCodeOptions = DIAL_CODES.map(d => ({ value: d.code, label: d.label }));

  return (
    <form onSubmit={handleSendSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {m.loginPhoneLabel()} <span className="text-rose-500">*</span>
        </label>
        <div className="flex gap-2" dir="ltr">
          <div className="w-32 shrink-0">
            <CustomSelect
              value={dialCode}
              onChange={setDialCode}
              options={dialCodeOptions}
              placeholder="Code"
            />
          </div>
          <input
            type="tel"
            inputMode="numeric"
            value={local}
            onChange={(e) => setLocal(toAsciiDigits(e.target.value).replace(/\D/g, ""))}
            placeholder={m.loginPhonePlaceholder()}
            required
            className={`${inputCls} flex-1`}
          />
        </div>
        {phoneHint && <div className="flex items-center gap-1.5 mt-1.5">
          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
          </svg>
          <p className="text-[11px] text-[var(--color-ink-fade)]">{m.loginPhoneHint()}</p>
        </div>}
      </div>

      {/* How to send the code: all choices in view, one tap each. */}
      {allowed.length > 1 && <div>
        <p className="text-sm font-medium text-[var(--color-ink)] mb-1.5">{m.otpChooseMethod()}</p>
        <div role="radiogroup" aria-label={m.otpChooseMethod()} className={`grid gap-2 ${allowed.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {allowed.map((mm) => {
            const on = method === mm.id;
            return (
              <button
                key={mm.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMethod(mm.id)}
                style={on ? { backgroundColor: mm.bg, borderColor: mm.color, color: mm.text } : undefined}
                className={`h-11 px-1 flex items-center justify-center gap-1 rounded-xl border text-[12.5px] font-bold whitespace-nowrap transition-colors ${
                  on ? "shadow-[0_1px_3px_rgba(11,12,15,0.08)]" : "bg-white border-[var(--color-hairline)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                }`}
              >
                <mm.Icon className="w-[18px] h-[18px] shrink-0" style={{ color: mm.color }} />
                {mm.label()}
              </button>
            );
          })}
        </div>
      </div>}

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
