import { auth } from "@clerk/nextjs/server";
import { ShieldAlert } from "lucide-react";

import { WidgetCustomizer } from "@/components/widget-customizer/widget-customizer";

/**
 * Phase 4 — Widget customizer (admin-gated).
 *
 * Appearance + behavior config with a live preview iframe and a copy-paste
 * install snippet. Writes are additionally enforced server-side in Convex via
 * `adminMutation`, so this page-level gate is the first line of defense.
 */
export default async function WidgetPage() {
  const { has } = await auth();

  if (!has({ role: "org:admin" })) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert className="size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Admins only</h2>
        <p className="text-sm text-muted-foreground">
          The widget customizer is restricted to workspace admins. Ask an admin
          to update your role if you need access.
        </p>
      </div>
    );
  }

  return <WidgetCustomizer />;
}
