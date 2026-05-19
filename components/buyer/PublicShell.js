"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/ui/LocaleSwitcher";
import SellerBrowseBar from "@/components/buyer/SellerBrowseBar";

export default function PublicShell({ children }) {
  const { t } = useT();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" dir="ltr" className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-rose-600 tracking-tight">Dasty2</span>
            <span className="text-lg font-medium text-gray-600">Mndalan</span>
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <Link
              href="/seller"
              className="text-sm font-medium bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors"
            >
              {t.sellNow}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-20 sm:pb-6">
        {children}
      </main>

      <SellerBrowseBar />

      <footer className="border-t border-gray-200 bg-white mt-12 py-6">
        <p className="text-center text-sm text-gray-400">
          © {new Date().getFullYear()} Dasty2 Mndalan — {t.footerText}
        </p>
      </footer>
    </div>
  );
}
