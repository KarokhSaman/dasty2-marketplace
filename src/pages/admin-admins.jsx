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
  const createLog = useMutation(api.adminLogs.create);
  const [search, setSearch] = useState("");
  const [confirmDemote, setConfirmDemote] = useState(null);

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
          {visibleAdmins.map((admin) => (
            <div
              key={admin._id}
              className="bg-white rounded-xl border border-[var(--color-hairline)] p-4 flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <span className="text-indigo-600 font-bold text-sm">{initials(admin)}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {admin.name}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-600">
                    Admin
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    admin.isActive ? "bg-green-100 text-green-700" : "bg-[var(--color-ember-50)] text-[var(--color-ink-fade)]"
                  }`}>
                    {admin.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {admin.email && (
                    <span className="text-xs text-[var(--color-ink-fade)]" dir="ltr">
                      {admin.email}
                    </span>
                  )}
                  {admin.clerkTokenIdentifier && (
                    <span className="text-xs text-gray-300 truncate max-w-full" dir="ltr">
                      {admin.clerkTokenIdentifier}
                    </span>
                  )}
                  <span className="text-xs text-gray-300">
                    {formatDate(admin.registeredAt)}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                {currentUser?._id === admin._id ? (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-[var(--color-ink-fade)]">
                    Current admin
                  </span>
                ) : confirmDemote === admin._id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await setRole({ id: admin._id, role: "seller" });
                        await createLog({
                          action: "admin_demoted_to_seller",
                          sellerName: admin.name,
                          notes: admin.email || undefined,
                        });
                        setConfirmDemote(null);
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                    >
                      Make seller
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDemote(null)}
                      className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-gray-100 text-[var(--color-ink-fade)] hover:bg-white/60 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDemote(admin._id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-[var(--color-ink-soft)] hover:bg-white/60 transition-colors"
                  >
                    Make seller
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
