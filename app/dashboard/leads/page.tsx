import { LeadsClient } from "@/components/leads/leads-client";

/**
 * Phase 4 — Lead management dashboard.
 *
 * Sortable / paginated / filterable leads table with inline status updates and
 * CSV export. Auth is enforced by the dashboard layout (org required) and by
 * every Convex orgQuery/orgMutation it calls.
 */
export default function LeadsPage() {
  return <LeadsClient />;
}
