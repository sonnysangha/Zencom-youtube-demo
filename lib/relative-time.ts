/**
 * Tiny dependency-free relative-time formatter for chat/inbox timestamps.
 * Returns compact strings like "now", "3m", "2h", "5d". For older items it
 * falls back to a short date.
 */
export function formatDistanceToNowStrict(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return "now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Clock time like "3:04 PM" for message bubbles. */
export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
