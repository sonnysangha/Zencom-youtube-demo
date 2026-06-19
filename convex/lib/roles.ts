export type OrgRole = "org:admin" | "org:member";

/**
 * Narrow a Clerk role string to one of our two supported literals.
 *
 * Clerk always emits the prefixed key (`org:admin` / `org:member`) on both the
 * JWT `org_role` claim and `organizationMembership.*` webhook payloads, so this
 * is primarily a `string -> OrgRole` type narrowing. Anything that isn't
 * `org:admin` (including a missing role) collapses to `org:member`.
 *
 * NOTE: this is intentionally lossy for a two-role model. If custom Clerk org
 * roles are ever enabled, widen `OrgRole` and this mapping together.
 */
export function normalizeRole(role: string | undefined): OrgRole {
  return role === "org:admin" ? "org:admin" : "org:member";
}
