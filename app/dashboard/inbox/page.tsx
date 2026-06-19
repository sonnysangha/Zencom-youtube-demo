import { InboxClient } from "@/components/inbox/inbox-client";

/**
 * Two-pane real-time inbox. Auth is enforced by the dashboard layout (org
 * required) and by every Convex orgQuery/orgMutation it calls. This page is a
 * thin server wrapper around the client experience.
 */
export default function InboxPage() {
  return (
    <div className="-m-4 md:-m-6 h-[calc(100vh-3.5rem)]">
      <InboxClient />
    </div>
  );
}
