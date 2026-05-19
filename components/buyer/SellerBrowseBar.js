"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function SellerBrowseBar() {
  const { t } = useT();
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    fetch("/api/seller/me")
      .then((r) => r.json())
      .then((d) => { if (d.sellerId) setIsSeller(true); });
  }, []);

  if (!isSeller) return null;

  return (
    <nav className="fixed bottom-0 start-0 end-0 bg-white border-t border-rose-100 z-30 flex sm:hidden shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      <Link
        href="/seller"
        className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-gray-400 hover:text-rose-600 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-[10px] font-semibold">{t.sellerDashboard}</span>
      </Link>

      <div className="w-px bg-gray-100 my-2" />

      <Link
        href="/seller/add"
        className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-rose-500 hover:text-rose-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-[10px] font-semibold">+ {t.sellerAddProduct}</span>
      </Link>
    </nav>
  );
}
