"use client";

import { useQuery } from "convex/react";
import {
  BookOpen,
  Contact,
  CreditCard,
  Inbox,
  Sparkles,
  Users,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const roadmap = [
  {
    title: "Real-time inbox",
    description: "A shared, two-pane inbox with live presence and assignment.",
    icon: Inbox,
  },
  {
    title: "Knowledge base",
    description: "Articles, doc ingestion, and a searchable help center.",
    icon: BookOpen,
  },
  {
    title: "Leads",
    description: "Capture and manage leads through their lifecycle.",
    icon: Contact,
  },
  {
    title: "AI answers",
    description: "RAG-powered, cited answers streamed into the widget.",
    icon: Sparkles,
  },
  {
    title: "Billing",
    description: "Seat-based Free / Pro / Enterprise plans with gating.",
    icon: CreditCard,
  },
];

export default function DashboardOverviewPage() {
  const workspace = useQuery(api.workspaces.current);
  const members = useQuery(api.members.list);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Your workspace at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Workspace</CardDescription>
            {workspace === undefined ? (
              <Skeleton className="h-7 w-40" />
            ) : (
              <CardTitle className="text-xl">
                {workspace?.name ?? "—"}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {workspace === undefined ? (
              <Skeleton className="h-5 w-56" />
            ) : workspace ? (
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Public key</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {workspace.publicKey}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <Badge variant="secondary">Free</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Provisioning your workspace…
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Team</CardDescription>
            {members === undefined ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <CardTitle className="text-xl">
                {members.length} {members.length === 1 ? "member" : "members"}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              Manage roles and invitations from the Team page.
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Coming together
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roadmap.map((item) => (
            <Card key={item.title} className="bg-muted/30">
              <CardHeader>
                <item.icon className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
