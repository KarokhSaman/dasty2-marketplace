import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(admin) {
  const source = admin.name || admin.email || "Admin";
  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}

export default function AdminAdminsPage() {
  const admins = useQuery(api.users.getAdmins);
  const currentUser = useQuery(api.users.getCurrent);
  const setRole = useMutation(api.users.setRole);
  const deleteAdmin = useMutation(api.users.deleteAdmin);
  const createLog = useMutation(api.adminLogs.create);
  const [search, setSearch] = useState("");
  const [expandedAdmin, setExpandedAdmin] = useState(null);

  const visibleAdmins = useMemo(() => {
    if (!admins) return [];
    const query = search.trim().toLowerCase();
    return admins
      .filter((admin) => {
        if (!query) return true;
        return (
          admin.name.toLowerCase().includes(query) ||
          (admin.email ?? "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  }, [admins, search]);

  if (!admins) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-44" />
        <div className="h-11 bg-gray-200 rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">Admins</h1>
          <p className="text-sm text-[var(--color-ink-fade)] mt-0.5">Accounts with admin access</p>
        </div>
        <span className="text-sm text-[var(--color-ink-fade)] shrink-0">
          {admins.length} admin{admins.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search admins"
          className="w-full border border-[var(--color-hairline)] rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300"
        />
      </div>

      {visibleAdmins.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-hairline)] py-16 text-center text-[var(--color-ink-fade)]">
          <p className="text-sm font-medium">No admins found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAdmins.map((admin) => {
            const isExpanded = expandedAdmin === admin._id;
            const isCurrent = currentUser?._id === admin._id;
            return (
            <div
              key={admin._id}
              className="bg-white rounded-xl border border-[var(--color-hairline)] overflow-hidden"
            >
              {/* Header Section - Clickable */}
              <div className="px-4 py-4 flex items-start gap-3 border-b border-[var(--color-hairline)] hover:bg-[var(--color-cream)] transition-colors">
                <button onClick={() => setExpandedAdmin(isExpanded ? null : admin._id)}
                  className="flex-1 flex items-start gap-3 text-left min-w-0">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 font-bold text-base">{initials(admin)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-ink)]">{admin.name}</p>
                    {admin.email && (
                      <p className="text-xs text-[var(--color-ink-soft)] mt-1.5 truncate" dir="ltr">
                        {admin.email}
                      </p>
                    )}
                    {admin.registeredAt && (
                      <p className="text-xs text-[var(--color-ink-fade)] mt-1 truncate">
                        Joined {formatDate(admin.registeredAt)}
                      </p>
                    )}
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-xs text-[var(--color-ink-fade)] font-semibold uppercase tracking-wide">Role</p>
                    <p className="text-sm font-semibold text-[var(--color-ink)] mt-0.5">
                      {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center pt-1">
                    <svg className={`w-5 h-5 text-[var(--color-ink-fade)] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </button>
                <div className="shrink-0 pt-1">
                  {!isCurrent && currentUser?.role === "super_admin" && (
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteAdmin({ id: admin._id });
                        await createLog({
                          action: "admin_deleted",
                          sellerName: admin.name,
                          notes: admin.email || undefined,
                        });
                      }}
                      className="p-1.5 text-[var(--color-ink-fade)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete admin"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Details Section - Collapsible */}
              {isExpanded && (
              <div className="px-4 py-4 space-y-2.5 border-b border-[var(--color-hairline)]">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-0.5">Role</p>
                  <p className="text-sm text-[var(--color-ink)]">
                    {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                    {isCurrent && " (Current)"}
                  </p>
                </div>
                {admin.email && (
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-0.5">Email</p>
                    <p className="text-sm text-[var(--color-ink)]" dir="ltr">{admin.email}</p>
                  </div>
                )}
                {admin.clerkTokenIdentifier && (
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-0.5">Clerk ID</p>
                    <p className="text-xs text-[var(--color-ink)]" dir="ltr">{admin.clerkTokenIdentifier}</p>
                  </div>
                )}
                {admin.registeredAt && (
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-0.5">Joined</p>
                    <p className="text-sm text-[var(--color-ink)]">{formatDate(admin.registeredAt)}</p>
                  </div>
                )}
              </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
