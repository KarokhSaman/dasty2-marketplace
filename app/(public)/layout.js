import { headers } from "next/headers";
import LocaleProvider from "@/lib/i18n/LocaleProvider";
import PublicShell from "@/components/buyer/PublicShell";

export default function PublicLayout({ children }) {
  const locale = headers().get("x-locale") || "ckb";

  return (
    <LocaleProvider locale={locale}>
      <PublicShell>{children}</PublicShell>
    </LocaleProvider>
  );
}
