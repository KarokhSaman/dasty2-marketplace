import { auth, clerkClient } from "@clerk/tanstack-react-start/server";

export const ADMIN_EMAILS = [
  "karokh.saman.aziz@gmail.com",
  "soma.karam.a@gmail.com",
] as const;

export async function getPrimaryEmail(userId: string) {
  const clerkUser = await clerkClient().users.getUser(userId);
  return (
    clerkUser.emailAddresses
      .find((email) => email.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress.toLowerCase() ?? ""
  );
}

export async function requireClerkAdmin() {
  const { userId, getToken } = await auth();
  if (!userId) return null;

  const email = await getPrimaryEmail(userId);
  if (!ADMIN_EMAILS.includes(email as (typeof ADMIN_EMAILS)[number])) {
    return null;
  }

  const token = await getToken();
  if (!token) return null;

  return { userId, email, token };
}
