import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexServerOptions } from "./convex";

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

  const token = await getToken();
  if (!token) return null;

  const user = await fetchMutation(
    api.users.ensureCurrent,
    {},
    convexServerOptions(token),
  ).catch(() => null);
  if (!user || (user.role !== "admin" && user.role !== "super_admin") || !user.isActive) return null;

  return { userId, email: user.email ?? "", token };
}
