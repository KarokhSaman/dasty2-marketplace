import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@clerk/tanstack-react-start'

export const Route = createFileRoute('/_public/sign-in/$')({
  component: SignInPage,
})

function SignInPage() {
  return (
    <div className="flex justify-center py-12">
      <SignIn routing="path" path="/sign-in" />
    </div>
  )
}
