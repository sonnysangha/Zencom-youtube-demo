import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { normalizeRole } from "./lib/roles";

const http = httpRouter();

/**
 * Clerk webhook receiver.
 *
 * Served at `${NEXT_PUBLIC_CONVEX_SITE_URL}/clerk-webhook` (the Convex `.site`
 * domain — NOT the `.cloud` deployment URL). Configure this URL in the Clerk
 * dashboard's webhook settings.
 *
 * Requires the `CLERK_WEBHOOK_SIGNING_SECRET` env var on the Convex deployment
 * (the "Signing Secret" shown for the endpoint in Clerk). This is a documented
 * MANUAL step — it is not yet set:
 *   npx convex env set CLERK_WEBHOOK_SIGNING_SECRET whsec_xxx
 *
 * Phase 1 owns organization + membership sync. Later phases append billing
 * branches to the same switch below.
 */
const handleClerkWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return new Response(
      "Missing CLERK_WEBHOOK_SIGNING_SECRET environment variable",
      { status: 500 },
    );
  }

  const body = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix signature headers", { status: 400 });
  }

  let evt: ClerkWebhookEvent;
  try {
    evt = new Webhook(secret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  switch (evt.type) {
    case "organization.created":
    case "organization.updated": {
      const data = evt.data;
      await ctx.runMutation(internal.workspaces.upsertFromClerk, {
        orgId: data.id,
        name: data.name,
        slug: data.slug ?? undefined,
        imageUrl: data.image_url ?? undefined,
      });
      break;
    }

    case "organization.deleted": {
      const data = evt.data;
      // Deleted payloads only guarantee the id.
      if (data.id) {
        await ctx.runMutation(internal.workspaces.deleteFromClerk, {
          orgId: data.id,
        });
      }
      break;
    }

    case "organizationMembership.created":
    case "organizationMembership.updated": {
      const data = evt.data;
      await ctx.runMutation(internal.members.upsertFromClerk, {
        orgId: data.organization.id,
        userId: data.public_user_data.user_id,
        role: normalizeRole(data.role),
        name: buildName(data.public_user_data),
        email: data.public_user_data.identifier ?? undefined,
        imageUrl: data.public_user_data.image_url ?? undefined,
      });
      break;
    }

    case "organizationMembership.deleted": {
      const data = evt.data;
      await ctx.runMutation(internal.members.removeFromClerk, {
        orgId: data.organization.id,
        userId: data.public_user_data.user_id,
      });
      break;
    }

    // Later phases append billing event branches here.
    default:
      // Acknowledge unhandled events so Clerk doesn't retry them.
      break;
  }

  return new Response(null, { status: 200 });
});

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: handleClerkWebhook,
});

function buildName(
  publicUserData: ClerkPublicUserData,
): string | undefined {
  const parts = [publicUserData.first_name, publicUserData.last_name].filter(
    (p): p is string => Boolean(p),
  );
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return publicUserData.identifier ?? undefined;
}

// ---------------------------------------------------------------------------
// Minimal types for the Clerk webhook payloads we consume. These mirror only
// the fields used above; the runtime payload contains more.
// ---------------------------------------------------------------------------
interface ClerkPublicUserData {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  identifier?: string | null;
}

type ClerkWebhookEvent =
  | {
      type: "organization.created" | "organization.updated";
      data: {
        id: string;
        name: string;
        slug?: string | null;
        image_url?: string | null;
      };
    }
  | {
      type: "organization.deleted";
      data: { id: string; deleted?: boolean };
    }
  | {
      type:
        | "organizationMembership.created"
        | "organizationMembership.updated"
        | "organizationMembership.deleted";
      data: {
        role: string;
        organization: { id: string };
        public_user_data: ClerkPublicUserData;
      };
    };

export default http;
