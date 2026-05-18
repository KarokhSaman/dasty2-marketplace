import { headers } from "next/headers";
import LocaleProvider from "@/lib/i18n/LocaleProvider";
import SellerShell from "@/components/seller/SellerShell";

export default function SellerLayout({ children }) {
  const locale = headers().get("x-locale") || "ckb";

  return (
    <LocaleProvider locale={locale}>
      <SellerShell>{children}</SellerShell>
    </LocaleProvider>
  );
}
