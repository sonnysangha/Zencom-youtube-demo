"use client";

import { useEffect, useRef } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";

/**
 * Idempotent, client-side workspace provisioning.
 *
 * Whenever an organization becomes active, this ensures a matching Convex
 * `workspaces` row (and the current user's `members` row) exists. This is the
 * "first-load upsert" half of provisioning — it keeps the app working without
 * depending on the Clerk -> Convex webhook being configured. The webhook
 * (convex/http.ts) keeps things in sync for events that happen while no one is
 * looking (e.g. another admin renames the org).
 *
 * Renders nothing.
 */
export function WorkspaceProvisioner() {
  const { organization, isLoaded } = useOrganization();
  const ensureProvisioned = useMutation(api.workspaces.ensureProvisioned);
  const provisionedOrgId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !organization) return;
    if (provisionedOrgId.current === organization.id) return;

    provisionedOrgId.current = organization.id;
    void ensureProvisioned({
      name: organization.name,
      slug: organization.slug ?? undefined,
      imageUrl: organization.imageUrl ?? undefined,
    }).catch((error) => {
      // On a fresh org switch the session token may not yet carry the new
      // org_id claim; clear the guard so the next render retries.
      provisionedOrgId.current = null;
      console.error("Workspace provisioning failed", error);
    });
  }, [isLoaded, organization, ensureProvisioned]);

  return null;
}
