import { useEffect, useState } from "react";
import * as m from "@/paraglide/messages";
import { shareStoryImage } from "@/lib/storyImage";
import BottomSheet from "./BottomSheet";
import WhatsAppIcon from "./WhatsAppIcon";

/**
 * Branded share sheet for a product link.
 *
 * Two classes of target:
 *   • Intent targets (WhatsApp, Telegram, Facebook) accept a URL in a web
 *     share intent, so one tap hands the link straight to the app.
 *   • Copy targets (Instagram, TikTok) have no public link-share intent —
 *     neither accepts a URL from the browser. We copy the link, then open the
 *     app (their https origins are universal links, so an installed app takes
 *     over) and tell the user to paste.
 *
 *   <ShareSheet open={open} onClose={...} url={productUrl} title={product.title} />
 */

// ── Brand marks ────────────────────────────────────────────
function TelegramIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
function FacebookIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z" />
    </svg>
  );
}
function InstagramIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.741 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.741 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.259 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 01-2.88 0 1.44 1.44 0 012.88 0z" />
    </svg>
  );
}
function TikTokIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}
function LinkIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m4.5-4.5l1.5-1.5a4 4 0 115.656 5.656l-3 3a4 4 0 01-5.656 0" />
    </svg>
  );
}
function DotsIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 12h.01M12 12h.01M19 12h.01" />
    </svg>
  );
}
function StoryIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="4" y="2.5" width="16" height="19" rx="3" strokeWidth={1.9} />
      <circle cx="12" cy="10" r="2.6" strokeWidth={1.9} />
      <path strokeLinecap="round" strokeWidth={1.9} d="M8 17.5h8" />
    </svg>
  );
}
function SpinnerIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M5 13l4 4L19 7" />
    </svg>
  );
}

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function ShareSheet({ open, onClose, url, title, story }) {
  // `copied` holds the app name we told the user to paste into, or "" for the
  // plain copy-link row. null = nothing copied yet.
  const [copied, setCopied] = useState(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [storyState, setStoryState] = useState(null); // busy | downloaded | failed

  // navigator.share is client-only — probing during render would desync SSR.
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    if (open) {
      setCopied(null);
      setStoryState(null);
    }
  }, [open]);

  const message = `${title} — ${url}`;

  const targets = [
    {
      key: "whatsapp",
      name: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(message)}`,
      tile: "bg-[#25D366]",
      Icon: WhatsAppIcon,
    },
    {
      key: "telegram",
      name: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      tile: "bg-[#229ED9]",
      Icon: TelegramIcon,
    },
    {
      key: "facebook",
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      tile: "bg-[#1877F2]",
      Icon: FacebookIcon,
    },
    {
      key: "instagram-dm",
      name: m.shareInstagramDM(),
      href: "https://www.instagram.com/",
      copyFirst: true,
      tile: "bg-[linear-gradient(45deg,#F58529_0%,#DD2A7B_45%,#8134AF_70%,#515BD4_100%)]",
      Icon: InstagramIcon,
    },
    {
      key: "tiktok",
      name: "TikTok",
      href: "https://www.tiktok.com/",
      copyFirst: true,
      tile: "bg-[#111]",
      Icon: TikTokIcon,
    },
  ];

  // Instagram/TikTok: copy before the anchor navigates so the link is on the
  // clipboard by the time the app opens. Fired inside the click handler, so
  // the write still runs under the user gesture iOS Safari requires.
  function onTargetClick(target) {
    if (!target.copyFirst) return;
    writeClipboard(url);
    setCopied(target.name);
  }

  async function onCopyLink() {
    if (await writeClipboard(url)) setCopied("");
  }

  // Instagram takes no link from the browser, but it does take an image from
  // the OS share sheet — so a Story share is "render a card, share the PNG".
  async function onShareStory() {
    if (storyState === "busy") return;
    setStoryState("busy");
    setCopied(null);
    // Put the link on the clipboard too: Instagram strips captions, so the
    // user needs it available for a sticker or their bio.
    writeClipboard(url);
    const result = await shareStoryImage({ ...story, code: story?.code });
    setStoryState(result === "shared" ? null : result);
    if (result === "shared") onClose?.();
  }

  async function onNativeShare() {
    try {
      await navigator.share({ title, url });
      onClose?.();
    } catch {
      /* dismissed */
    }
  }

  const row =
    "w-full flex items-center gap-3 px-5 py-3.5 text-[15px] text-[var(--color-ink)] hover:bg-[var(--color-cream-deep)] tap text-start";

  return (
    <BottomSheet open={open} onClose={onClose} title={m.shareSheetTitle()}>
      <div className="px-5 pt-4 pb-2 grid grid-cols-5 gap-2">
        {targets.map(({ key, name, href, tile, Icon, copyFirst }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (key === "instagram-dm") {
                e.preventDefault();
                // Use native share sheet for Instagram DM
                // This gives Instagram better control over opening to the right screen
                if (canNativeShare) {
                  navigator.share({
                    title,
                    text: url,
                    url
                  }).catch(() => {
                    // Fallback if user dismisses share sheet
                    writeClipboard(url);
                    setCopied(name);
                  });
                } else {
                  // Fallback: copy link and open Instagram
                  writeClipboard(url);
                  setCopied(name);
                  setTimeout(() => {
                    window.open("https://instagram.com", "_blank");
                  }, 100);
                }
              } else {
                onTargetClick({ name, copyFirst });
              }
            }}
            className="flex flex-col items-center gap-1.5 tap"
          >
            <span
              className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-white shadow-[0_4px_12px_-4px_rgba(11,12,15,0.35)] ${tile}`}
            >
              <Icon className="w-6 h-6" />
            </span>
            <span className="text-[10.5px] text-[var(--color-ink-soft)] leading-tight text-center">
              {name}
            </span>
          </a>
        ))}
      </div>

      {copied !== null && (
        <p className="px-5 pb-1 pt-2 text-[12.5px] text-[var(--color-ink-soft)] text-center scale-in">
          {copied ? m.sharePasteHint({ app: copied }) : m.linkCopied()}
        </p>
      )}

      <div className="mt-2 border-t border-[var(--color-hairline)]">
        {story && (
          <button
            type="button"
            onClick={onShareStory}
            disabled={storyState === "busy"}
            className={`${row} disabled:opacity-60`}
          >
            <span className="w-9 h-9 rounded-full bg-[linear-gradient(45deg,#F58529_0%,#DD2A7B_45%,#8134AF_70%,#515BD4_100%)] text-white flex items-center justify-center shrink-0">
              {storyState === "busy" ? <SpinnerIcon /> : <StoryIcon />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate">{m.shareStory()}</span>
              {(storyState === "downloaded" || storyState === "failed") && (
                <span className="block text-[12.5px] text-[var(--color-ink-soft)]">
                  {storyState === "downloaded" ? m.shareStoryDownloaded() : m.shareStoryFailed()}
                </span>
              )}
            </span>
          </button>
        )}

        <button type="button" onClick={onCopyLink} className={row}>
          <span className="w-9 h-9 rounded-full bg-[var(--color-cream-deep)] text-[var(--color-ink-soft)] flex items-center justify-center shrink-0">
            {copied === "" ? <CheckIcon /> : <LinkIcon />}
          </span>
          {copied === "" ? m.linkCopied() : m.copyLink()}
        </button>

        {canNativeShare && (
          <button type="button" onClick={onNativeShare} className={row}>
            <span className="w-9 h-9 rounded-full bg-[var(--color-cream-deep)] text-[var(--color-ink-soft)] flex items-center justify-center shrink-0">
              <DotsIcon />
            </span>
            {m.shareMore()}
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
