import { useEffect, useState } from "react";
import { useUser } from "@clerk/tanstack-react-start";
import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getCityOptions } from "@/lib/cities";
import CustomSelect from "@/components/ui/CustomSelect";
import { sellerClerkRegisterFn, sellerClerkSyncFn } from "@/lib/clerk-seller";
import { useGlobalSellerSession } from "@/lib/SellerSessionContext";

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
  const { setSellerId } = useGlobalSellerSession();
  const navigate = useNavigate();
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [city,    setCity]    = useState("Erbil");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await sellerClerkRegisterFn({ data: { name, phone, city, address } });
      if (res.ok) {
        setSellerId(res.sellerId);
        navigate({ to: "/seller", replace: true });
        return;
      }
      setError(res.error ?? "unknown_error");
    } catch {
      setError("unknown_error");
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
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {m.loginPhoneLabel()} <span className="text-rose-500">*</span>
        </label>
        <input type="tel" inputMode="numeric" value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
          placeholder={m.loginPhonePlaceholder()} required dir="ltr"
          className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition" />
        <div className="flex items-center gap-1.5 mt-1.5">
          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <p className="text-[11px] text-[var(--color-ink-fade)]">{m.loginPhoneHint()}</p>
        </div>
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
      <button type="submit" disabled={loading || !name.trim() || !phone.trim() || !address.trim()}
        className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
        {loading ? "..." : m.continueBtn()}
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────
export default function SellerCompleteProfilePage() {
  const { isLoaded, isSignedIn } = useUser();
  const convexAuth = useConvexAuth();
  const { setSellerId } = useGlobalSellerSession();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking | form

  // Match the login completion flow: wait for Convex to accept the Clerk token,
  // then verify whether this signed-in user still needs a seller profile.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      navigate({ to: "/seller/login", replace: true });
      return;
    }
    if (convexAuth.isLoading) {
      setStatus("checking");
      return;
    }
    if (!convexAuth.isAuthenticated) {
      navigate({ to: "/seller/login", replace: true });
      return;
    }

    let cancelled = false;
    setStatus("checking");

    sellerClerkSyncFn()
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.needsProfile) {
          setStatus("form");
          return;
        }
        if (res.ok && res.sellerId) {
          setSellerId(res.sellerId);
          navigate({ to: "/seller", replace: true });
          return;
        }
        // account_inactive / convex_auth_failed / not_authenticated
        navigate({ to: "/seller/login", replace: true });
      })
      .catch(() => {
        if (cancelled) return;
        navigate({ to: "/seller/login", replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [
    convexAuth.isAuthenticated,
    convexAuth.isLoading,
    isLoaded,
    isSignedIn,
    navigate,
    setSellerId,
  ]);

  const showForm = status === "form";

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
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </div>
                    <div>
                      <p className="text-[var(--color-ink)] font-semibold text-sm">{m.profileExplainPhoneT()}</p>
                      <p className="text-[var(--color-ink-soft)] text-xs mt-0.5 leading-relaxed">{m.profileExplainPhoneD()}</p>
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
