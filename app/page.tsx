import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { ArrowRight, LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LifeBuoy className="size-4" />
          </div>
          <span className="font-semibold">Zencom</span>
        </div>
        <div className="flex items-center gap-2">
          <Show
            when="signed-out"
            fallback={
              <Button asChild>
                <Link href="/dashboard">
                  Dashboard <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          >
            <Button asChild variant="ghost">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
          </Show>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <Badge variant="secondary">Multi-tenant support platform</Badge>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Customer support, reinvented.
        </h1>
        <p className="max-w-xl text-pretty text-muted-foreground">
          A real-time shared inbox, AI-powered answers from your knowledge base,
          and a self-serve help center — all in one workspace.
        </p>
        <div className="flex items-center gap-3">
          <Show
            when="signed-out"
            fallback={
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Go to dashboard <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          >
            <Button asChild size="lg">
              <Link href="/sign-up">Start free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </Show>
        </div>
      </main>
    </div>
  );
}
