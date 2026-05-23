import { createFileRoute } from '@tanstack/react-router'
import HomePage from '@/src/pages/home'

export const Route = createFileRoute('/_public/')({
  component: HomePage,
})
