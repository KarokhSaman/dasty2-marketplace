import { createFileRoute } from '@tanstack/react-router'
import AdminLoginPage from '@/pages/admin-login'

export const Route = createFileRoute('/_public/admin/login')({
  component: AdminLoginPage,
})
