import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { SignIn, useAuth } from '@clerk/tanstack-react-start'
import { useEffect } from 'react'

export const Route = createFileRoute('/_public/sign-in/$')({
  component: SignInPage,
})

// Clerk supports virtual routing at runtime; this package type still lists
// only path/hash for the SignIn component.
const clerkVirtualRouting = 'virtual' as never

function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate({ to: '/seller/login', search: { profile: '1' }, replace: true })
    }
  }, [isLoaded, isSignedIn, navigate])

  if (!isLoaded || isSignedIn) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-10 h-10 border-2 border-rose-100 border-t-rose-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex justify-center py-12">
      <SignIn
        routing={clerkVirtualRouting}
        forceRedirectUrl="/seller/login?profile=1"
        signUpForceRedirectUrl="/seller/login?profile=1"
      />
    </div>
  )
}
