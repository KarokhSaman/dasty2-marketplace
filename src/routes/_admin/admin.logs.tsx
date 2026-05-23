import { createFileRoute } from '@tanstack/react-router'
import AdminLogsPage from '@/src/pages/admin-logs'

export const Route = createFileRoute('/_admin/admin/logs')({
  component: AdminLogsPage,
})
