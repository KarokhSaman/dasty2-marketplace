import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@clerk/tanstack-react-start'

export const Route = createFileRoute('/_public/sign-up/$')({
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <div className="flex justify-center py-12">
      <SignUp
        routing="path"
        path="/sign-up"
        forceRedirectUrl="/seller/login"
        signInForceRedirectUrl="/seller/login"
      />
    </div>
  )
}
