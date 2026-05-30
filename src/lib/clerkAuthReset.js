export async function clearLocalClerkAuth(clerk, appLogoutPaths) {
  const logoutPaths = Array.isArray(appLogoutPaths)
    ? appLogoutPaths
    : [appLogoutPaths]

  await Promise.all(
    logoutPaths.map((path) =>
      fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
      }).catch(() => {}),
    ),
  )

  await clerk.signOut().catch(() => {})
  await clerk.client?.removeSessions?.().catch(() => {})

  try {
    clerk.client?.clearCache?.()
    clerk.client?.resetSignIn?.()
    clerk.client?.resetSignUp?.()
  } catch {
    // Local cache cleanup is best effort; the next Clerk load will rebuild it.
  }
}
