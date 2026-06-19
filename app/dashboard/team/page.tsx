import { auth } from "@clerk/nextjs/server";
import { OrganizationProfile } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";

export default async function TeamPage() {
  const { has } = await auth();

  // Admin-gated: only workspace admins can manage the team.
  if (!has({ role: "org:admin" })) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert className="size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Admins only</h2>
        <p className="text-sm text-muted-foreground">
          Team management is restricted to workspace admins. Ask an admin to
          update your role if you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Invite teammates, manage roles, and configure your workspace.
        </p>
      </div>
      <OrganizationProfile
        routing="hash"
        appearance={{ elements: { rootBox: "w-full", cardBox: "w-full max-w-none shadow-none" } }}
      />
    </div>
  );
}
