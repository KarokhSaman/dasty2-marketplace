import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as m from "@/paraglide/messages";

const SPEED = 40; // pixels per second
const fmt = (n) => Number(n).toLocaleString("en-US");
const pad = (n) => String(n).padStart(2, "0");

// The offer ends at the end of its last day, Iraq time (UTC+3).
function offerEndsAt(endDate) {
  const [y, mo, d] = endDate.split("-").map(Number);
  return Date.UTC(y, mo - 1, d + 1) - 3 * 60 * 60 * 1000;
}

// Starts after the page is in the browser (null until then), so the server and
// the first browser render show the same thing.
function useCountdown(endDate) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return { days: null, time: "--:--:--" };
  const left = Math.max(0, offerEndsAt(endDate) - now);
  return {
    days: Math.floor(left / 864e5),
    time: `${pad(Math.floor(left / 36e5) % 24)}:${pad(Math.floor(left / 6e4) % 60)}:${pad(Math.floor(left / 1e3) % 60)}`,
  };
}

function offerLines(offer) {
  const limit = offer.maxPrice ? fmt(offer.maxPrice) : null;
  const fee =
    offer.type === "free"
      ? limit ? m.offerTickerNoFeeUnder({ amount: limit }) : m.offerNoFeeNote()
      : limit
        ? m.offerTickerFlatUnder({ fee: fmt(offer.flatFeeAmount ?? 0), amount: limit })
        : m.offerFlatFeeNote({ amount: fmt(offer.flatFeeAmount ?? 0) });
  return [
    fee,
    offer.title,
    offer.description,
    m.offerTickerPostNow(),
    limit ? m.offerTickerAboveLimit({ amount: limit }) : null,
  ].filter(Boolean);
}

// Seller dashboard offer bar: an "Offer" tag, the offer's messages scrolling
// slowly past (paused while touched or hovered, still when motion is reduced),
// and a live countdown to the end of the offer.
export default function OfferTicker({ offer }) {
  const trackRef = useRef(null);
  const runRef = useRef(null);
  const [duration, setDuration] = useState(22);
  const [paused, setPaused] = useState(false);
  const { days, time } = useCountdown(offer.endDate);
  const lines = offerLines(offer);

  // Keep the scrolling speed the same however long the messages are.
  useLayoutEffect(() => {
    const track = trackRef.current;
    const run = runRef.current;
    if (!track || !run) return;
    setDuration(Math.max(8, (track.offsetWidth + run.scrollWidth) / SPEED));
  }, [lines.join("|")]);

  const lastDay = days === 0;

  return (
    <div
      className="offer-ticker flex items-stretch rounded-[14px] overflow-hidden bg-[var(--color-ink)] text-white mb-4 cursor-pointer select-none"
      data-paused={paused}
      onClick={() => setPaused((p) => !p)}
      role="region"
      aria-label={m.offerTag()}
    >
      <span className="shrink-0 inline-flex items-center gap-1 px-[7px] bg-[var(--color-ember-600)] text-[10.5px] font-extrabold uppercase tracking-[0.03em]">
        <svg className="offer-tag-icon w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
          <circle cx="7.5" cy="7.5" r="1.5" />
        </svg>
        {m.offerTag()}
      </span>

      <div
        ref={trackRef}
        className="relative flex-1 min-w-0 overflow-hidden py-2.5 [mask-image:linear-gradient(to_right,transparent,#000_18px,#000_calc(100%-18px),transparent)]"
      >
        <div
          ref={runRef}
          className="offer-ticker-run inline-flex gap-7 whitespace-nowrap text-[12.5px] font-semibold ps-[100%]"
          style={{ "--ticker-duration": `${duration}s` }}
        >
          {lines.map((line, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              <span className="w-[5px] h-[5px] rounded-full bg-[var(--color-ember-300)]" aria-hidden="true" />
              {line}
            </span>
          ))}
        </div>
      </div>

      <span
        dir="ltr"
        role="timer"
        aria-label={m.offerTickerTimeLeft()}
        className={`shrink-0 self-center mx-2 inline-flex items-center gap-[5px] px-[9px] py-[5px] rounded-[10px] text-xs font-bold tabular-nums whitespace-nowrap ${
          lastDay ? "bg-[var(--color-ember-600)]" : "bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
        }`}
      >
        <svg className="w-[13px] h-[13px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        {days === null || lastDay ? (
          <b className="font-extrabold">{time}</b>
        ) : (
          <>
            <b className="font-extrabold text-[var(--color-ember-300)]">{days}d</b> {time}
          </>
        )}
      </span>
    </div>
  );
}
