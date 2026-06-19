export type OrgRole = "org:admin" | "org:member";

/**
 * Narrow a Clerk role string to one of our two supported literals.
 *
 * Clerk emits the role in TWO formats depending on the source:
 *   - the prefixed key `org:admin` / `org:member` — on `organizationMembership.*`
 *     webhook payloads and the default session-token `org_role` claim;
 *   - the BARE role `admin` / `member` — from the JWT-template `{{org.role}}`
 *     shortcode, which is what our "convex" template (and therefore the token
 *     Convex validates) actually carries.
 *
 * We strip an optional `org:` prefix and match the bare role, so both formats
 * map correctly. Anything that isn't admin (including a missing role) collapses
 * to `org:member`.
 *
 * NOTE: this is intentionally lossy for a two-role model. If custom Clerk org
 * roles are ever enabled, widen `OrgRole` and this mapping together.
 */
export function normalizeRole(role: string | undefined): OrgRole {
  if (!role) return "org:member";
  const bare = role.startsWith("org:") ? role.slice("org:".length) : role;
  return bare === "admin" ? "org:admin" : "org:member";
}
