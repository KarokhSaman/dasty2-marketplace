import { createFileRoute, Outlet } from '@tanstack/react-router'
import PublicShell from '@/components/buyer/PublicShell'

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <PublicShell>
      <Outlet />
    </PublicShell>
  )
}
