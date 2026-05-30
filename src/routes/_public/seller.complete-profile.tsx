import { createFileRoute } from '@tanstack/react-router'
import SellerCompleteProfilePage from '@/src/pages/seller-complete-profile'

export const Route = createFileRoute('/_public/seller/complete-profile')({
  component: SellerCompleteProfilePage,
})
