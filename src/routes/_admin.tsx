import { createFileRoute, Outlet } from '@tanstack/react-router'
import AdminShell from '@/components/admin/AdminShell'
import { requireAdminFn } from '@/src/server/auth-guards'

export const Route = createFileRoute('/_admin')({
  beforeLoad: async () => {
    const { adminEmail } = await requireAdminFn()
    return { adminEmail }
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}
