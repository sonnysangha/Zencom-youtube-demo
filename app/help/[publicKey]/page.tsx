import { HelpCenter } from "@/components/help/help-center";

/**
 * Phase 3 — Public help center for a workspace, addressed by its publicKey.
 * Unauthenticated (added to proxy.ts public routes). Tenancy is resolved
 * server-side in Convex from the key.
 */
export default async function HelpCenterPage({
  params,
}: {
  params: Promise<{ publicKey: string }>;
}) {
  const { publicKey } = await params;
  return <HelpCenter publicKey={publicKey} />;
}
