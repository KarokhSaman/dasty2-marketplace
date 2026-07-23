import * as m from "@/paraglide/messages";
import OtpLogin from "@/components/auth/OtpLogin";
import MockLoginButton from "@/components/auth/MockLoginButton";

export default function AdminLoginPage() {
  async function handleVerified(role) {
    if (role === "admin" || role === "super_admin") {
      window.location.href = "/admin";
      return;
    }
    // Verification creates the session before this role check. Clear it so an
    // attempted admin login never leaves a seller silently signed in.
    await fetch("/api/auth/logout", { method: "POST" });
    return { error: m.otpNotAuthorized() };
  }

  return (
    <div className="flex items-center justify-center min-h-[75vh]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{m.adminLoginTitle()}</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          <OtpLogin onVerified={handleVerified} />
          <MockLoginButton role="admin" />
        </div>
      </div>
    </div>
  );
}
