import { Check, Minus } from "lucide-react";

type Cell = boolean | string;

interface Row {
  label: string;
  free: Cell;
  pro: Cell;
  enterprise: Cell;
}

interface Group {
  category: string;
  rows: Row[];
}

// Rows reflect the real Clerk Billing plan feature sets (see lib/entitlements.ts):
//   free_org   → shared_inbox, knowledge_base
//   pro        → + ai_agent, lead_capture, widget_customization, analytics
//   enterprise → + sso, audit_logs, priority_support
// "Pricing" prices are per seat / month and match Clerk: $0 / $40 / $120.
const GROUPS: Group[] = [
  {
    category: "Pricing",
    rows: [
      { label: "Price (per seat / month)", free: "$0", pro: "$40", enterprise: "$120" },
      { label: "Seats", free: "Up to 3", pro: "Unlimited", enterprise: "Unlimited" },
    ],
  },
  {
    category: "Shared inbox",
    rows: [
      { label: "Real-time shared inbox", free: true, pro: true, enterprise: true },
      { label: "Assignment & statuses", free: true, pro: true, enterprise: true },
      { label: "Human takeover", free: true, pro: true, enterprise: true },
    ],
  },
  {
    category: "Knowledge base & AI",
    rows: [
      { label: "Knowledge base", free: "1", pro: "Unlimited", enterprise: "Unlimited" },
      { label: "Public help center", free: true, pro: true, enterprise: true },
      { label: "AI agent replies with citations", free: false, pro: true, enterprise: true },
      { label: "Doc import (MD / TXT / PDF)", free: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Leads & growth",
    rows: [
      { label: "Website chat widget", free: true, pro: true, enterprise: true },
      { label: "Lead capture form", free: false, pro: true, enterprise: true },
      { label: "Lead CSV export", free: false, pro: true, enterprise: true },
      { label: "Widget customization", free: false, pro: true, enterprise: true },
      { label: "Analytics & reporting", free: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Security & support",
    rows: [
      { label: "SSO / SAML", free: false, pro: false, enterprise: true },
      { label: "Audit logs", free: false, pro: false, enterprise: true },
      { label: "Priority support", free: false, pro: false, enterprise: true },
      { label: "Support", free: "Community", pro: "Standard", enterprise: "Priority" },
    ],
  },
];

function CellValue({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Check className="size-3.5" />
      </span>
    );
  }
  if (value === false) {
    return <Minus className="mx-auto size-4 text-muted-foreground/50" />;
  }
  return <span className="text-sm text-foreground">{value}</span>;
}

export function PricingComparison() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border/70 bg-muted/30">
            <th className="w-2/5 px-5 py-4 text-sm font-medium text-muted-foreground">
              Compare plans
            </th>
            <th className="px-5 py-4 text-center text-sm font-semibold">Free</th>
            <th className="px-5 py-4 text-center text-sm font-semibold text-brand">
              Pro
            </th>
            <th className="px-5 py-4 text-center text-sm font-semibold">
              Enterprise
            </th>
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((group) => (
            <FragmentGroup key={group.category} group={group} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FragmentGroup({ group }: { group: Group }) {
  return (
    <>
      <tr className="border-b border-border/60 bg-muted/15">
        <td
          colSpan={4}
          className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {group.category}
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr
          key={`${group.category}-${row.label}`}
          className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/20"
        >
          <td className="px-5 py-3.5 text-sm text-foreground">{row.label}</td>
          <td className="px-5 py-3.5 text-center">
            <CellValue value={row.free} />
          </td>
          <td className="bg-brand/[0.03] px-5 py-3.5 text-center">
            <CellValue value={row.pro} />
          </td>
          <td className="px-5 py-3.5 text-center">
            <CellValue value={row.enterprise} />
          </td>
        </tr>
      ))}
    </>
  );
}
