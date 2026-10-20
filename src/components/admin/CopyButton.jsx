import { useEffect, useState } from "react";
import * as m from "@/paraglide/messages";

// Small icon button that copies `text` to the clipboard and briefly shows a
// checkmark. Used beside phone numbers in the admin panel.
export default function CopyButton({ text, label = m.copyNumber() }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleCopy(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context / permissions) — nothing to do.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? m.linkCopied() : label}
      aria-label={copied ? m.linkCopied() : label}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full border transition-colors ${
        copied
          ? "bg-green-500 border-green-500 text-white"
          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
      }`}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="9" y="9" width="11" height="11" rx="2" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15V5a2 2 0 012-2h10" />
        </svg>
      )}
    </button>
  );
}
