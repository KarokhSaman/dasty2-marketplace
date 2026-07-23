import { createFileRoute, Outlet } from '@tanstack/react-router'
import AdminShell from '@/components/admin/AdminShell'
import { requireAdmin } from '@/lib/route-guards'

export const Route = createFileRoute('/_admin')({
  beforeLoad: async ({ context }) => {
    const { user } = await requireAdmin(context.queryClient)
    return { adminEmail: user.email ?? '' }
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
