import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader, SearchBox, FilterChips, Avatar, Code, Empty, Skeleton, btn } from "@/components/admin/ui";
import { ACTIONS, TONE } from "@/components/admin/logActions";

const PAGE = 60;
const dayLabel = (iso) => {
  const d = new Date(iso);
  const t = new Date();
  const y = new Date(Date.now() - 864e5);
  if (d.toDateString() === t.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
};
const time = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// Every admin and seller action, newest first, grouped by day.
export default function AdminLogsPage() {
  const logs = useQuery(api.adminLogs.getAll);
  const [q, setQ] = useState("");
  const [who, setWho] = useState("all");
  const [shown, setShown] = useState(PAGE);

  const sorted = useMemo(() => [...(logs ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [logs]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sorted.filter((l) => {
      const admin = !!(l.adminName || l.adminEmail);
      if (who === "admins" && !admin) return false;
      if (who === "sellers" && admin) return false;
      if (!needle) return true;
      return [l.productTitle, l.productCode, l.sellerName, l.adminName, l.notes, ACTIONS[l.action]?.[0] ?? l.action]
        .some((v) => (v ?? "").toLowerCase().includes(needle));
    });
  }, [sorted, q, who]);

  if (!logs) return <Skeleton rows={8} />;

  const groups = [];
  for (const l of list.slice(0, shown)) {
    const label = dayLabel(l.createdAt);
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1).items.push(l);
  }

  return (
    <div>
      <PageHeader title="Admin log" sub="Who changed what, newest first" />
      <div className="space-y-2.5 mb-4">
        <SearchBox value={q} onChange={setQ} placeholder="Search product, code, seller or admin" />
        <FilterChips value={who} onChange={setWho} options={[
          { value: "all", label: "Everyone", count: sorted.length },
          { value: "admins", label: "Admins" },
          { value: "sellers", label: "Sellers" },
        ]} />
      </div>
      {groups.length === 0 && <div className="rounded-2xl border border-adm-line bg-adm-surface"><Empty>No actions match.</Empty></div>}
      {groups.map((g) => (
        <section key={g.label} className="mb-5">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.06em] text-adm-fade mb-2">{g.label}</h2>
          <div className="bg-adm-surface border border-adm-line rounded-2xl overflow-hidden divide-y divide-adm-line">
            {g.items.map((l) => {
              const [label, tone] = ACTIONS[l.action] ?? [(l.action || "").replace(/_/g, " "), "grey"];
              const isAdmin = !!(l.adminName || l.adminEmail);
              const actor = l.adminName || l.adminEmail || l.sellerName || "Unknown";
              return (
                <div key={l._id} className="flex items-start gap-3 px-3.5 py-3">
                  <Avatar name={actor} size={34} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] font-semibold">{actor}</span>
                      {!isAdmin && <span className="text-[11px] text-adm-fade">seller</span>}
                      <span className={`h-[20px] px-2 rounded-full text-[10.5px] font-bold inline-flex items-center ${TONE[tone]}`}>{label}</span>
                    </div>
                    {(l.productTitle || l.productCode || (isAdmin && l.sellerName)) && (
                      <p className="text-[12.5px] text-adm-soft mt-0.5 flex items-center gap-1.5 min-w-0">
                        {l.productCode && <Code>{l.productCode}</Code>}
                        <span className="truncate">{[l.productTitle, isAdmin ? l.sellerName : null].filter(Boolean).join(" · ")}</span>
                      </p>
                    )}
                    {l.notes && <p className={`text-[12px] mt-1 ${l.action === "rejected" ? "text-st-rejected" : "text-adm-fade"}`}>{l.notes}</p>}
                  </div>
                  <span className="text-[11px] text-adm-fade tabular-nums shrink-0 mt-0.5">{time(l.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {list.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className={`${btn("outline")} w-full`}>Show more ({list.length - shown} left)</button>
      )}
    </div>
  );
}
