import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getCityOptions } from "@/lib/cities";
import BottomSheet from "@/components/ui/BottomSheet";
import { api } from "@/convex/_generated/api";
import { guessCity } from "@/lib/geo";

// Where to go once the profile is saved: the add form when the seller came
// from Sell now (?next=add), otherwise the dashboard.
function nextPath() {
  if (typeof window === "undefined") return "/seller";
  return new URLSearchParams(window.location.search).get("next") === "add" ? "/seller/add" : "/seller";
}

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

// The number they just verified — buyers reach them there on WhatsApp.
function VerifiedPhone({ phone }) {
  // On its own line the number reads as written (+964…) in every language.
  return (
    <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-3.5 py-2.5">
      <svg className="w-5 h-5 text-green-500 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-[var(--color-ink-soft)]">{m.profileExplainPhoneT()}</p>
        <p className="text-[15px] font-semibold text-[var(--color-ink)]"><span dir="ltr" className="inline-block tabular-nums">{phone}</span></p>
      </div>
      <span className="w-6 h-6 rounded-full bg-white text-green-600 grid place-items-center shrink-0">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    </div>
  );
}

// First city of the "rest of Iraq" group in IRAQ_CITIES; Kurdistan's come before it.
const FIRST_IRAQ_CITY = "Baghdad";

// Kurdish (Sorani) alphabet order. The browser's built-in sorting doesn't know
// letters like ڕ ڵ ۆ ێ ە, so Kurdish names are compared letter by letter here.
const KU_ALPHABET = "ئابپتجچحخدرڕزژسشعغفڤقکگلڵمنوۆهھەیێ";
const kuRank = (ch) => {
  const i = KU_ALPHABET.indexOf(ch);
  return i === -1 ? KU_ALPHABET.length + ch.charCodeAt(0) : i;
};
function compareKurdish(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const d = kuRank(a[i]) - kuRank(b[i]);
    if (d) return d;
  }
  return a.length - b.length;
}
function sortByLabel(list, locale) {
  const cmp = locale === "ckb"
    ? (x, y) => compareKurdish(x.label, y.label)
    : locale === "ar"
      // Arabic lists sort by the word itself, not the article "ال".
      ? (x, y) => x.label.replace(/^ال/, "").localeCompare(y.label.replace(/^ال/, ""), "ar")
      : (x, y) => x.label.localeCompare(y.label, "en");
  return [...list].sort(cmp);
}

// City: a field that opens a bottom sheet of cities as chips, Kurdistan first,
// each group in alphabetical order for the page's language.
function CityPicker({ value, onChange, placeholder, title }) {
  const locale = getLocale();
  const [open, setOpen] = useState(false);
  const options = getCityOptions(locale);
  const split = options.findIndex((o) => o.value === FIRST_IRAQ_CITY);
  const groups = (split > 0 ? [options.slice(0, split), options.slice(split)] : [options]).map((g) => sortByLabel(g, locale));
  const selected = options.find((o) => o.value === value);
  const pick = (v) => { onChange(v); setOpen(false); };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`${inputCls} flex items-center justify-between text-start ${selected ? "" : "text-[var(--color-ink-fade)]"}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg className="w-4 h-4 text-[var(--color-ink-soft)] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="p-4 space-y-4">
          {groups.map((group, gi) => (
            <div key={gi} className={`flex flex-wrap gap-2 ${gi ? "pt-4 border-t border-[var(--color-hairline)]" : ""}`}>
              {group.map((o) => {
                const on = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(o.value)}
                    className={`h-10 px-4 rounded-full border text-sm font-semibold transition-colors ${
                      on
                        ? "bg-[var(--color-ember-500)] border-[var(--color-ember-500)] text-white"
                        : "bg-white border-[var(--color-hairline)] text-[var(--color-ink)] hover:border-[var(--color-ember-300)]"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition";

// ── Profile completion form ───────────────────────────────
function ProfileForm({ phone }) {
  const completeProfile = useMutation(api.users.completeSellerProfile);
  const [name,    setName]    = useState("");
  // Starts with Cloudflare's guess of where they are (if it's one of our
  // cities); the seller can change it. Empty when there's no guess.
  const [city,    setCity]    = useState("");
  useEffect(() => {
    let active = true;
    guessCity()
      .then(({ city: guessed }) => {
        if (active && guessed) setCity((current) => current || guessed);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
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
      window.location.href = nextPath();
      return;
    } catch {
      setError(m.errorGeneral());
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {phone && <VerifiedPhone phone={phone} />}
      <div>
        <label htmlFor="profile-name" className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {m.registerNameLabel()} <span className="text-rose-500">*</span>
        </label>
        <input id="profile-name" type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder={m.registerNamePlaceholder()} required autoComplete="name" className={inputCls} />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {m.registerCityLabel()} <span className="text-rose-500">*</span>
        </label>
        <CityPicker value={city} onChange={setCity} placeholder={m.registerCityPlaceholder()} title={m.registerCityLabel()} />
      </div>
      <div>
        <label htmlFor="profile-address" className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {m.registerAddressLabel()} <span className="text-rose-500">*</span>
        </label>
        <input id="profile-address" type="text" value={address} onChange={e => setAddress(e.target.value)}
          placeholder={m.registerAddressPlaceholder()} required className={inputCls} />
      </div>
      {error && <ErrorBox message={error} />}
      <button type="submit" disabled={loading || !name.trim() || !city || !address.trim()}
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
      navigate({ to: nextPath(), replace: true });
    }
  }, [isLoading, isAuthenticated, me, navigate]);

  const showForm = isAuthenticated && me !== undefined && (!me || !me.name || !me.name.trim());

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
              <div className="bg-white rounded-2xl border border-[var(--color-hairline)] shadow-sm p-6 sm:p-7">
                <h1 className="text-xl font-display text-[var(--color-ink)] mb-1">{m.profileStepTitle()}</h1>
                <p className="text-sm text-[var(--color-ink-soft)] mb-5">{m.profileStepSubtitle()}</p>
                <ProfileForm phone={me?.phone} />
              </div>
              <p className="text-center text-xs text-[var(--color-ink-fade)] mt-5">{m.loginTermsNote()}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
