import { auth } from "@clerk/nextjs/server";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { OrgGate } from "@/components/dashboard/org-gate";
import { WorkspaceProvisioner } from "@/components/dashboard/workspace-provisioner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId } = await auth();

  // B2B-only: every dashboard view operates inside an organization/workspace.
  // Without an active org, prompt the user to create one.
  if (!orgId) {
    return <OrgGate />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
      {/* Mirrors the active Clerk org into Convex on load (idempotent). */}
      <WorkspaceProvisioner />
    </SidebarProvider>
  );
}
