import { createFileRoute } from '@tanstack/react-router'
import AdminTemplatesPage from '@/pages/admin-templates'

export const Route = createFileRoute('/_admin/admin/templates')({
  component: AdminTemplatesPage,
})
