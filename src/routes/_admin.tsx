import { createFileRoute, Outlet } from '@tanstack/react-router'
import AdminShell from '@/components/admin/AdminShell'
import { requireAdmin } from '@/lib/route-guards'

export const Route = createFileRoute('/_admin')({
  // Admin pages can be added to the iPhone Home Screen as their own app
  // ("Mndallan Admin"): it opens at /admin full-screen, with no Safari bars.
  head: () => ({
    meta: [
      { title: 'Mndallan Admin' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Mndallan Admin' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'theme-color', content: '#fefcf9' },
    ],
    links: [
      { rel: 'manifest', href: '/admin.webmanifest' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/admin-180.png' },
    ],
  }),
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
