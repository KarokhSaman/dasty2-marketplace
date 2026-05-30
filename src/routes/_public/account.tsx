import { createFileRoute } from '@tanstack/react-router'
import BuyerAccountPage from '@/pages/account'

export const Route = createFileRoute('/_public/account')({
  component: BuyerAccountPage,
})
