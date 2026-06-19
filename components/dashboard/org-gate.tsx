"use client";

import { CreateOrganization } from "@clerk/nextjs";

/**
 * Shown when an authenticated user has no active organization. Zencom is
 * B2B-only (personal accounts hidden), so every user must belong to a
 * workspace. Creating one here lands them back in the dashboard, where the
 * WorkspaceProvisioner mirrors the org into Convex.
 */
export function OrgGate() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your workspace
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Zencom organizes your inbox, knowledge base, and team around a
          workspace. Create one to get started.
        </p>
      </div>
      <CreateOrganization
        afterCreateOrganizationUrl="/dashboard"
        skipInvitationScreen
      />
    </div>
  );
}
