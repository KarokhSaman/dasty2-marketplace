import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import { PageHeader, SearchBox, Avatar, Empty, Skeleton } from "@/components/admin/ui";
import { RowList } from "@/components/admin/ProductRow";

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

export default function AdminAdminsPage() {
  const admins = useQuery(api.users.getAdmins);
  const currentUser = useQuery(api.users.getCurrent);
  const setRole = useMutation(api.users.setRole);
  const deleteAdmin = useMutation(api.users.deleteAdmin);
  const createLog = useMutation(api.adminLogs.create);
  const [search, setSearch] = useState("");

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

  if (!admins) return <Skeleton rows={3} />;

  const log = (action, admin) => createLog({ action, sellerName: admin.name, notes: admin.email || undefined });

  return (
    <div>
      <PageHeader title="Admins" sub={`${admins.length} account${admins.length === 1 ? "" : "s"} with admin access`} />
      <div className="mb-3"><SearchBox value={search} onChange={setSearch} placeholder="Search admins" /></div>
      <RowList>
        {visibleAdmins.length === 0 && <Empty>No admins found</Empty>}
        {visibleAdmins.map((admin) => {
          const isCurrent = currentUser?._id === admin._id;
          const superAdmin = admin.role === "super_admin";
          return (
            <div key={admin._id} className="flex items-center gap-3 px-3 lg:px-4 py-3 min-h-[72px]">
              <Avatar name={admin.name || admin.email} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[14.5px] font-semibold truncate">{admin.name || "Admin"}</span>
                  <span className={`h-[20px] px-2 rounded-full text-[10.5px] font-bold inline-flex items-center ${superAdmin ? "bg-adm-accent-soft text-adm-accent" : "bg-adm-sunk text-adm-soft"}`}>
                    {superAdmin ? "Super admin" : "Admin"}
                  </span>
                  {isCurrent && <span className="text-[11px] text-adm-fade">(you)</span>}
                </div>
                {admin.email && <p className="text-[12px] text-adm-soft truncate" dir="ltr">{admin.email}</p>}
                <p className="text-[11.5px] text-adm-fade">
                  {admin.phone && <span dir="ltr" className="tabular-nums">{admin.phone} · </span>}
                  Joined {formatDate(admin.registeredAt)}
                </p>
              </div>
              {currentUser?.role === "super_admin" && (
                <AdminActionsMenu
                  admin={admin}
                  isCurrent={isCurrent}
                  onPromoteToSuperAdmin={async () => { await setRole({ id: admin._id, role: "super_admin" }); await log("admin_promoted_to_super_admin", admin); }}
                  onDemoteToAdmin={async () => { await setRole({ id: admin._id, role: "admin" }); await log("super_admin_demoted_to_admin", admin); }}
                  onMakeSeller={async () => { await setRole({ id: admin._id, role: "seller" }); await log("admin_demoted_to_seller", admin); }}
                  onDelete={async () => { await deleteAdmin({ id: admin._id }); await log("admin_deleted", admin); }}
                />
              )}
            </div>
          );
        })}
      </RowList>
    </div>
  );
}
