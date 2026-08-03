import { createFileRoute } from '@tanstack/react-router'
import SellerCompleteProfilePage from '@/pages/seller-complete-profile'

// Minimal layout with NO navigation for profile completion
function MinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      {children}
    </div>
  )
}

export const Route = createFileRoute('/_public/seller/complete-profile')({
  component: () => (
    <MinimalLayout>
      <SellerCompleteProfilePage />
    </MinimalLayout>
  ),
})
