import { LayoutDashboard, Users, type LucideIcon } from "lucide-react";

export type OrgRole = "org:admin" | "org:member";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** If set, only members holding this role see the entry (gated via Clerk `has`). */
  requiredRole?: OrgRole;
  /** When true, the link is only "active" on an exact path match (default: prefix match). */
  exact?: boolean;
}

/**
 * Extensible dashboard navigation registry.
 *
 * This is the single place tracks register their sidebar entries. Later phases
 * append their items here (Inbox, Knowledge base, Leads, Billing, Widget
 * customizer, ...) — keep additions append-only so parallel tracks merge
 * cleanly. Role-gated entries set `requiredRole`; the sidebar filters them with
 * Clerk's `has({ role })`.
 */
export const navItems: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  {
    title: "Team",
    href: "/dashboard/team",
    icon: Users,
    requiredRole: "org:admin",
  },
  // Wave A/B tracks append here, e.g.:
  // { title: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  // { title: "Knowledge base", href: "/dashboard/knowledge", icon: BookOpen, requiredRole: "org:admin" },
  // { title: "Leads", href: "/dashboard/leads", icon: Contact },
  // { title: "Billing", href: "/dashboard/billing", icon: CreditCard, requiredRole: "org:admin" },
];
