import { createFileRoute } from '@tanstack/react-router'
import BuyerAccountPage from '@/src/pages/account'

export const Route = createFileRoute('/_public/account')({
  component: BuyerAccountPage,
})
