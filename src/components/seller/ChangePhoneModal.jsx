import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";

export default function ChangePhoneModal({ currentPhone, onClose, onSuccess }) {
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationKey, setVerificationKey] = useState("");
  const [methodName, setMethodName] = useState("");

  const sendOtp = useAction(api.authActions.sendOtp);
  const verifyOtpForPhoneChange = useAction(api.authActions.verifyOtpForPhoneChange);
  const updatePhone = useMutation(api.users.updatePhone);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await sendOtp({
        methodName: "sms-otp",
        phoneNumber: newPhone,
        language: "en",
        clientIpv4: "127.0.0.1",
      });
      setVerificationKey(result.verificationKey);
      setMethodName(result.methodName);
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
        code: otp.trim(),
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
    setStep("phone");
    setOtp("");
    setError("");
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-[var(--color-hairline)] p-5 max-w-sm w-full">
        <h2 className="text-sm font-bold text-[var(--color-ink)] mb-4">Change Phone Number</h2>

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                Current Phone
              </label>
              <div className="w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-cream)] px-4 py-2.5 text-[var(--color-ink)] text-sm" dir="ltr">
                {currentPhone}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                New Phone Number
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+964..."
                required
                className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition"
                dir="ltr"
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
                disabled={loading || !newPhone}
                className="flex-1 bg-[var(--color-ember-500)] hover:bg-[var(--color-ember-600)] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-[var(--color-cream-deep)] text-[var(--color-ink)] text-sm font-semibold py-2.5 rounded-xl hover:bg-[var(--color-cream-deep)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <p className="text-xs text-[var(--color-ink-soft)] mb-2">
              Enter the OTP sent to {newPhone}
            </p>

            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                Verification Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                maxLength="6"
                required
                className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition text-center text-lg tracking-widest"
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
                disabled={loading || otp.length < 6}
                className="flex-1 bg-[var(--color-ember-500)] hover:bg-[var(--color-ember-600)] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-[var(--color-cream-deep)] text-[var(--color-ink)] text-sm font-semibold py-2.5 rounded-xl hover:bg-[var(--color-cream-deep)] transition-colors"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
