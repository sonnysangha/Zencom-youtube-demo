import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes that never require authentication.
// Later phases extend this list (e.g. the marketing site, /widget, /help,
// public embed APIs). The Clerk -> Convex webhook is served from the Convex
// `.site` domain, so it does not pass through this Next.js proxy.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // ===== PHASE 5: Billing & plans =====
  "/pricing(.*)",
  // ===== END PHASE 5 =====
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
