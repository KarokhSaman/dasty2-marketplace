import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getCityOptions } from "@/lib/cities";
import CustomSelect from "@/components/ui/CustomSelect";
import { api } from "@/convex/_generated/api";

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

// ── Profile completion form ───────────────────────────────
function ProfileForm() {
  const locale = getLocale();
  const completeProfile = useMutation(api.users.completeSellerProfile);
  const [name,    setName]    = useState("");
  const [city,    setCity]    = useState("Erbil");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await completeProfile({
        name: name.trim(),
        city,
        address: address.trim() || undefined,
      });
      // Hard nav so the shell/guards pick up the now-complete profile.
      window.location.href = "/seller";
      return;
    } catch {
      setError(m.errorGeneral());
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {m.registerNameLabel()} <span className="text-rose-500">*</span>
        </label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder={m.registerNamePlaceholder()} required
          className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition" />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">{m.registerCityLabel()}</label>
        <CustomSelect value={city} onChange={setCity} options={getCityOptions(locale)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {m.registerAddressLabel()} <span className="text-rose-500">*</span>
        </label>
        <input type="text" value={address} onChange={e => setAddress(e.target.value)}
          placeholder={m.registerAddressPlaceholder()} required
          className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition" />
      </div>
      {error && <ErrorBox message={error} />}
      <button type="submit" disabled={loading || !name.trim() || !address.trim()}
        className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
        {loading ? "..." : m.continueBtn()}
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────
export default function SellerCompleteProfilePage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();
  const me = useQuery(api.users.getCurrent, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate({ to: "/seller/login", replace: true });
      return;
    }
    if (me === undefined) return; // still loading
    // No user row (shouldn't happen post-verify) or already-completed profile.
    if (me && me.name && me.name.trim()) {
      navigate({ to: "/seller", replace: true });
    }
  }, [isLoading, isAuthenticated, me, navigate]);

  const showForm = isAuthenticated && me !== undefined && (!me || !me.name || !me.name.trim());

  // Hide the seller shell nav by using data attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-hide-seller-nav', 'true');
    return () => document.documentElement.removeAttribute('data-hide-seller-nav');
  }, []);

  return (
    <div className="-mx-4 -my-6 lg:min-h-[calc(100vh-56px)] flex items-center justify-center bg-[var(--color-cream)]">
      <div className="flex items-center justify-center px-6 py-10 w-full">
        <div className="w-full max-w-sm">
          {!showForm && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[var(--color-ink-soft)]">...</p>
            </div>
          )}

          {showForm && (
            <>
              <div className="bg-white rounded-2xl border border-[var(--color-hairline)] p-5 mb-4">
                <p className="text-xs font-semibold text-[var(--color-ink-fade)] uppercase tracking-widest mb-4">{m.profileExplainLabel()}</p>
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[var(--color-ember-50)] flex items-center justify-center text-[var(--color-ember-600)] shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                      <p className="text-[var(--color-ink)] font-semibold text-sm">{m.profileExplainNameT()}</p>
                      <p className="text-[var(--color-ink-soft)] text-xs mt-0.5 leading-relaxed">{m.profileExplainNameD()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[var(--color-ember-50)] flex items-center justify-center text-[var(--color-ember-600)] shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-[var(--color-ink)] font-semibold text-sm">{m.profileExplainCityT()}</p>
                      <p className="text-[var(--color-ink-soft)] text-xs mt-0.5 leading-relaxed">{m.profileExplainCityD()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[var(--color-ember-50)] flex items-center justify-center text-[var(--color-ember-600)] shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    </div>
                    <div>
                      <p className="text-[var(--color-ink)] font-semibold text-sm">{m.profileExplainAddressT()}</p>
                      <p className="text-[var(--color-ink-soft)] text-xs mt-0.5 leading-relaxed">{m.profileExplainAddressD()}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[var(--color-hairline)] shadow-sm p-7">
                <h1 className="text-xl font-display text-[var(--color-ink)] mb-1">{m.profileStepTitle()}</h1>
                <p className="text-sm text-[var(--color-ink-soft)] mb-6">{m.profileStepSubtitle()}</p>
                <ProfileForm />
              </div>
              <p className="text-center text-xs text-[var(--color-ink-fade)] mt-5">{m.loginTermsNote()}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
