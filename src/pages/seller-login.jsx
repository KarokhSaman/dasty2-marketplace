import { useState } from "react";
import * as m from "@/paraglide/messages";
import OtpLogin from "@/components/auth/OtpLogin";
import MockLoginButton from "@/components/auth/MockLoginButton";
import BottomSheet from "@/components/ui/BottomSheet";

// ── Fee tiers ─────────────────────────────────────────────
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

function getSteps() {
  return [
    { icon: STEP_ICONS[0], title: m.loginStep1T(), desc: m.loginStep1D() },
    { icon: STEP_ICONS[1], title: m.loginStep2T(), desc: m.loginStep2D() },
    { icon: STEP_ICONS[2], title: m.loginStep3T(), desc: m.loginStep3D() },
    { icon: STEP_ICONS[3], title: m.loginStep4T(), desc: m.loginStep4D() },
  ];
}

function StepsList({ compact = false }) {
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {getSteps().map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className={`${compact ? "w-7 h-7" : "w-8 h-8"} rounded-xl bg-[var(--color-ember-50)] flex items-center justify-center text-[var(--color-ember-600)] shrink-0 mt-0.5`}>
            {step.icon}
          </div>
          <div>
            <p className="text-[var(--color-ink)] font-semibold text-sm">{step.title}</p>
            <p className="text-[var(--color-ink-soft)] text-xs mt-0.5 leading-relaxed">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeePreview() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-white rounded-xl border border-[var(--color-hairline)] p-2.5 text-center">
        <p className="text-[var(--color-ink-soft)] text-[10px] font-medium">{m.loginFeesUpTo9k()}</p>
        <p className="text-rose-600 font-bold text-sm mt-0.5">2,000 IQD</p>
      </div>
      <div className="bg-white rounded-xl border border-[var(--color-hairline)] p-2.5 text-center">
        <p className="text-[var(--color-ink-soft)] text-[10px] font-medium">{m.loginFeesUpTo99k()}</p>
        <p className="text-rose-600 font-bold text-sm mt-0.5">5,000 IQD</p>
      </div>
    </div>
  );
}

function FeeTable() {
  return (
    <div className="space-y-2 p-5">
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">{m.loginFeesNote()}</p>
      {FEE_TIERS.map((tier) => (
        <div key={tier.range} className="flex items-center justify-between rounded-xl bg-[var(--color-cream)] px-3.5 py-2.5 text-sm">
          <span className="text-[var(--color-ink-soft)] font-mono text-xs">{tier.range}</span>
          <span className="text-rose-600 font-bold">{tier.fee} IQD</span>
        </div>
      ))}
    </div>
  );
}

// Desktop-only reassurance. The primary login task stays in the right column.
function InfoPanel({ onOpenFees }) {
  return (
    <aside className="hidden lg:flex h-full min-h-0 flex-col justify-center overflow-hidden bg-white border-e border-[var(--color-hairline)] px-10 py-8 xl:px-14">
      <div className="max-w-lg">
        <p className="text-xl font-bold tracking-tight mb-4" dir="ltr">
          <span className="text-[var(--color-ember-600)]">Dasty2</span>{" "}
          <span className="font-medium text-[var(--color-ink-soft)]">Mndalan</span>
        </p>
        <h2 className="text-3xl xl:text-4xl font-display text-[var(--color-ink)] leading-tight">{m.loginHeroTitle()}</h2>
        <p className="text-[var(--color-ink-soft)] mt-3 text-sm leading-relaxed">{m.loginHeroSub()}</p>

        <div className="mt-7">
          <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-widest mb-3">{m.loginHowLabel()}</p>
          <StepsList compact />
        </div>

        <div className="mt-7 rounded-2xl bg-[var(--color-cream)] p-3.5">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{m.loginFeesTitle()}</p>
            <button
              type="button"
              onClick={onOpenFees}
              className="text-[11px] font-semibold text-[var(--color-ember-600)] hover:underline"
            >
              {m.loginFeesViewFull()}
            </button>
          </div>
          <FeePreview />
        </div>
      </div>
    </aside>
  );
}

function MobileInfoActions({ onOpenHow, onOpenFees }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:hidden">
      <button
        type="button"
        onClick={onOpenHow}
        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-hairline)] bg-white text-xs font-semibold text-[var(--color-ink)]"
      >
        <svg className="w-4 h-4 text-[var(--color-ember-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {m.loginHowLabel()}
      </button>
      <button
        type="button"
        onClick={onOpenFees}
        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-hairline)] bg-white text-xs font-semibold text-[var(--color-ink)]"
      >
        <svg className="w-4 h-4 text-[var(--color-ember-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 9v1m9-5a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {m.loginFeesSec()}
      </button>
    </div>
  );
}

function InfoSheet({ type, onClose }) {
  const isHow = type === "how";
  return (
    <BottomSheet
      open={Boolean(type)}
      onClose={onClose}
      title={isHow ? m.loginHowLabel() : m.loginFeesSec()}
    >
      {isHow ? (
        <div className="p-5">
          <StepsList />
        </div>
      ) : (
        <FeeTable />
      )}
    </BottomSheet>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function SellerLoginPage() {
  const [infoSheet, setInfoSheet] = useState(null);

  // Route by role after a verified OTP. Hard navigation so the new session
  // cookie is picked up by the Convex provider + SSR guards. New sellers land on
  // complete-profile, which bounces to /seller once their profile is filled.
  async function handleVerified(role) {
    if (role === "admin" || role === "super_admin") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/seller/complete-profile";
    }
  }

  return (
    <>
      <div className="h-[calc(100dvh-3.5rem-1px)] min-h-0 overflow-hidden bg-[var(--color-cream)] lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <InfoPanel onOpenFees={() => setInfoSheet("fees")} />

        <section className="flex h-full min-h-0 items-start justify-center overflow-y-auto px-5 py-5 sm:px-8 lg:items-center lg:overflow-hidden lg:py-8">
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-2xl border border-[var(--color-hairline)] shadow-sm p-5 sm:p-6">
              <h1 className="text-2xl font-display text-[var(--color-ink)] mb-1">{m.loginTitle()}</h1>
              <p className="text-[13px] leading-relaxed text-[var(--color-ink-soft)] mb-4">{m.loginHeroSub()}</p>
              <OtpLogin onVerified={handleVerified} />
              <MockLoginButton role="seller" />
            </div>

            <div className="mt-3">
              <MobileInfoActions
                onOpenHow={() => setInfoSheet("how")}
                onOpenFees={() => setInfoSheet("fees")}
              />
            </div>
            <p className="text-center text-[10px] leading-relaxed text-[var(--color-ink-fade)] mt-2.5">{m.loginTermsNote()}</p>
          </div>
        </section>
      </div>
      <InfoSheet type={infoSheet} onClose={() => setInfoSheet(null)} />
    </>
  );
}
