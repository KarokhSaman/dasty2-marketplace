import { headers } from "next/headers";
import LocaleProvider from "@/lib/i18n/LocaleProvider";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminLayout({ children }) {
  const locale = headers().get("x-locale") || "ckb";
  return (
    <LocaleProvider locale={locale}>
      <AdminShell>{children}</AdminShell>
    </LocaleProvider>
  );
}
