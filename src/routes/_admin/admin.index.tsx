import { createFileRoute } from '@tanstack/react-router'
import AdminTodoPage from '@/pages/admin-todo'

export const Route = createFileRoute('/_admin/admin/')({
  component: AdminTodoPage,
})
