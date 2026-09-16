import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { getLocale, getTextDirection } from "@/paraglide/runtime";
import { DEFAULT_DIAL_CODE, DIAL_CODES, OTP_METHODS, toE164, isPlausiblePhone } from "@/lib/phone";
import CustomSelect from "@/components/ui/CustomSelect";

export default function ChangePhoneModal({ currentPhone, onClose, onSuccess }) {
  const locale = getLocale();
  const [step, setStep] = useState("phone"); // "phone" | "method" | "otp"
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE); // Default to Iraq
  const [local, setLocal] = useState("");
  const [otpMethod, setOtpMethod] = useState("whatsapp-otp"); // Default to WhatsApp
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationKey, setVerificationKey] = useState("");

  const e164 = toE164(dialCode, local);

  const sendOtp = useAction(api.authActions.sendOtp);
  const verifyOtpForPhoneChange = useAction(api.authActions.verifyOtpForPhoneChange);
  const updatePhone = useMutation(api.users.updatePhone);

  function handlePhoneSubmit(e) {
    e.preventDefault();
    setError("");
    if (!isPlausiblePhone(dialCode, local)) {
      setError("Please enter a valid phone number");
      return;
    }
    setStep("method");
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await sendOtp({
        methodName: otpMethod,
        phoneNumber: e164,
        language: "en",
        clientIpv4: "127.0.0.1",
      });
      setVerificationKey(result.verificationKey);
      setCode("");
      setStep("otp");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await verifyOtpForPhoneChange({
        code: code.trim(),
        verificationKey,
      });

      if (!result.ok) {
        setError(result.errorMessage || "Invalid OTP");
        return;
      }

      // OTP verified, now update the phone in database
      await updatePhone({ newPhone: result.verifiedPhone });
      onSuccess(result.verifiedPhone);
    } catch (err) {
      setError(err.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step === "otp") {
      setStep("method");
      setCode("");
      setError("");
    } else if (step === "method") {
      setStep("phone");
      setError("");
    }
  }

  const dialCodeOptions = DIAL_CODES.map(d => ({ value: d.code, label: d.label }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-[var(--color-hairline)] p-5 max-w-sm w-full">
        <h2 className="text-sm font-bold text-[var(--color-ink)] mb-4">{m.changePhoneTitle()}</h2>

        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                {m.changePhoneCurrent()}
              </label>
              <div className={`w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-cream)] px-4 py-2.5 text-[var(--color-ink)] text-sm ${getTextDirection(locale) === "rtl" ? "text-end" : "text-start"}`} dir="ltr">
                {currentPhone}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                {m.changePhoneCountry()}
              </label>
              <CustomSelect
                value={dialCode}
                onChange={setDialCode}
                options={dialCodeOptions}
                placeholder="Select country"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                {m.changePhoneNew()}
              </label>
              <div className="flex gap-2" dir="ltr">
                <div className="bg-[var(--color-cream)] rounded-xl border border-[var(--color-hairline)] px-3 py-2.5 text-[var(--color-ink)] text-sm w-16 flex items-center justify-center shrink-0 font-medium">
                  {dialCode}
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={local}
                  onChange={(e) => setLocal(e.target.value.replace(/\D/g, ""))}
                  placeholder="7X0000000"
                  required
                  className="flex-1 rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={!local}
                className="flex-1 bg-[var(--color-ember-500)] hover:bg-[var(--color-ember-600)] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {m.changePhoneContinue()}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-[var(--color-cream-deep)] text-[var(--color-ink)] text-sm font-semibold py-2.5 rounded-xl hover:bg-[var(--color-cream-deep)] transition-colors"
              >
                {m.changePhoneCancel()}
              </button>
            </div>
          </form>
        ) : step === "method" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <p className="text-xs text-[var(--color-ink-soft)]">
              {m.changePhoneMethod()}
            </p>

            <div className="space-y-2">
              {OTP_METHODS.map((methodOption) => (
                <label key={methodOption.id} className="flex items-center p-3 border-2 rounded-xl cursor-pointer transition-colors" style={{
                  borderColor: otpMethod === methodOption.id ? "var(--color-ember-400)" : "var(--color-hairline)",
                  backgroundColor: otpMethod === methodOption.id ? "var(--color-ember-50)" : "white",
                }}>
                  <input
                    type="radio"
                    name="otpMethod"
                    value={methodOption.id}
                    checked={otpMethod === methodOption.id}
                    onChange={(e) => setOtpMethod(e.target.value)}
                    className="w-4 h-4 accent-[var(--color-ember-500)]"
                  />
                  <span className="ms-3 text-sm font-medium text-[var(--color-ink)]">{methodOption.label}</span>
                </label>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[var(--color-ember-500)] hover:bg-[var(--color-ember-600)] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? "..." : m.changePhoneSend()}
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-[var(--color-cream-deep)] text-[var(--color-ink)] text-sm font-semibold py-2.5 rounded-xl hover:bg-[var(--color-cream-deep)] transition-colors"
              >
                {m.changePhoneBack()}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <p className="text-xs text-[var(--color-ink-soft)] mb-2" dir="ltr">
              {m.otpSent({ phone: e164 })}
            </p>

            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                {m.changePhoneCode()}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="00000"
                maxLength="5"
                required
                inputMode="numeric"
                className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition text-center text-lg tracking-widest font-mono"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || code.length < 5}
                className="flex-1 bg-[var(--color-ember-500)] hover:bg-[var(--color-ember-600)] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? "..." : m.changePhoneVerify()}
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-[var(--color-cream-deep)] text-[var(--color-ink)] text-sm font-semibold py-2.5 rounded-xl hover:bg-[var(--color-cream-deep)] transition-colors"
              >
                {m.changePhoneBack()}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
