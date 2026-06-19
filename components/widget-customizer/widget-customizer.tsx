"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Copy,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LauncherPosition = "bottom-right" | "bottom-left";
type FaqEntry = { question: string; answer: string };

type WidgetConfig = {
  primaryColor: string;
  radius: number;
  marginX: number;
  marginY: number;
  title: string;
  logoUrl?: string;
  launcherPosition: LauncherPosition;
  soundEnabled: boolean;
  proactiveEnabled: boolean;
  proactiveDelaySeconds: number;
  proactiveMessage: string;
  leadCaptureEnabled: boolean;
  leadRequireName: boolean;
  leadRequireEmail: boolean;
  leadRequirePhone: boolean;
  faq: FaqEntry[];
};

export function WidgetCustomizer() {
  const saved = useQuery(api.widgetConfig.get);
  const workspace = useQuery(api.workspaces.current);
  const update = useMutation(api.widgetConfig.update);
  const reset = useMutation(api.widgetConfig.reset);

  const [draft, setDraft] = useState<WidgetConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Seed the draft from the saved config the first time it loads (and re-seed
  // whenever a new saved-config object arrives, e.g. after a reset). This is
  // React's "adjusting state when a prop changes" pattern: compare the latest
  // dependency to a previous value held in state and set during render — no
  // effect, no ref, so it's lint-clean under the React Compiler rules.
  const [seededFrom, setSeededFrom] = useState<WidgetConfig | null>(null);
  if (saved && seededFrom !== saved) {
    setSeededFrom(saved);
    setDraft({ ...saved, faq: saved.faq.map((f) => ({ ...f })) });
  }

  const set = <K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await update({
        primaryColor: draft.primaryColor,
        radius: draft.radius,
        marginX: draft.marginX,
        marginY: draft.marginY,
        title: draft.title,
        logoUrl: draft.logoUrl?.trim() || undefined,
        launcherPosition: draft.launcherPosition,
        soundEnabled: draft.soundEnabled,
        proactiveEnabled: draft.proactiveEnabled,
        proactiveDelaySeconds: draft.proactiveDelaySeconds,
        proactiveMessage: draft.proactiveMessage,
        leadCaptureEnabled: draft.leadCaptureEnabled,
        leadRequireName: draft.leadRequireName,
        leadRequireEmail: draft.leadRequireEmail,
        leadRequirePhone: draft.leadRequirePhone,
        faq: draft.faq
          .filter((f) => f.question.trim() && f.answer.trim())
          .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })),
      });
      toast.success("Widget settings saved");
    } catch {
      toast.error("Couldn't save settings");
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    try {
      await reset();
      setDraft(null);
      toast.success("Reset to defaults");
    } catch {
      toast.error("Couldn't reset");
    }
  };

  if (draft === null) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Widget customizer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Style your chat widget and tune its behavior. Changes preview live;
            click Save to publish.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save changes
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(360px,420px)]">
        {/* ---- Controls ---- */}
        <div className="min-w-0">
          <Tabs defaultValue="appearance">
            <TabsList>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
              <TabsTrigger value="install">Install</TabsTrigger>
            </TabsList>

            {/* Appearance */}
            <TabsContent
              value="appearance"
              className="mt-4 flex flex-col gap-5 rounded-lg border border-border bg-card p-5"
            >
              <Field label="Widget title">
                <Input
                  value={draft.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Support"
                />
              </Field>

              <Field label="Logo URL (optional)">
                <Input
                  value={draft.logoUrl ?? ""}
                  onChange={(e) => set("logoUrl", e.target.value)}
                  placeholder="https://…/logo.png"
                />
              </Field>

              <Field label="Primary color">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={draft.primaryColor}
                    onChange={(e) => set("primaryColor", e.target.value)}
                    className="size-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                    aria-label="Primary color"
                  />
                  <Input
                    value={draft.primaryColor}
                    onChange={(e) => set("primaryColor", e.target.value)}
                    className="w-32 font-mono"
                  />
                </div>
              </Field>

              <SliderField
                label="Corner radius"
                value={draft.radius}
                min={0}
                max={32}
                suffix="px"
                onChange={(v) => set("radius", v)}
              />

              <div className="grid grid-cols-2 gap-4">
                <SliderField
                  label="Horizontal margin"
                  value={draft.marginX}
                  min={0}
                  max={64}
                  suffix="px"
                  onChange={(v) => set("marginX", v)}
                />
                <SliderField
                  label="Vertical margin"
                  value={draft.marginY}
                  min={0}
                  max={64}
                  suffix="px"
                  onChange={(v) => set("marginY", v)}
                />
              </div>

              <Field label="Launcher position">
                <Select
                  value={draft.launcherPosition}
                  onValueChange={(v) =>
                    set("launcherPosition", v as LauncherPosition)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom right</SelectItem>
                    <SelectItem value="bottom-left">Bottom left</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <ToggleRow
                label="Notification sound"
                description="Play a chime when a new agent reply arrives."
                checked={draft.soundEnabled}
                onChange={(v) => set("soundEnabled", v)}
              />
            </TabsContent>

            {/* Behavior */}
            <TabsContent
              value="behavior"
              className="mt-4 flex flex-col gap-5 rounded-lg border border-border bg-card p-5"
            >
              <ToggleRow
                label="Proactive message"
                description="Auto-open a greeting after the visitor lingers on the page."
                checked={draft.proactiveEnabled}
                onChange={(v) => set("proactiveEnabled", v)}
              />
              {draft.proactiveEnabled && (
                <div className="flex flex-col gap-4 rounded-md border border-border bg-muted/30 p-4">
                  <SliderField
                    label="Delay before showing"
                    value={draft.proactiveDelaySeconds}
                    min={1}
                    max={60}
                    suffix="s"
                    onChange={(v) => set("proactiveDelaySeconds", v)}
                  />
                  <Field label="Proactive message">
                    <Textarea
                      value={draft.proactiveMessage}
                      onChange={(e) =>
                        set("proactiveMessage", e.target.value)
                      }
                      rows={2}
                    />
                  </Field>
                </div>
              )}

              <Separator />

              <ToggleRow
                label="Lead capture"
                description="Ask visitors for their details before they can chat."
                checked={draft.leadCaptureEnabled}
                onChange={(v) => set("leadCaptureEnabled", v)}
              />
              {draft.leadCaptureEnabled && (
                <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Required fields
                  </p>
                  <ToggleRow
                    compact
                    label="Name"
                    checked={draft.leadRequireName}
                    onChange={(v) => set("leadRequireName", v)}
                  />
                  <ToggleRow
                    compact
                    label="Email"
                    checked={draft.leadRequireEmail}
                    onChange={(v) => set("leadRequireEmail", v)}
                  />
                  <ToggleRow
                    compact
                    label="Phone"
                    checked={draft.leadRequirePhone}
                    onChange={(v) => set("leadRequirePhone", v)}
                  />
                </div>
              )}

              <Separator />

              <FaqEditor
                faq={draft.faq}
                onChange={(faq) => set("faq", faq)}
              />
            </TabsContent>

            {/* Install */}
            <TabsContent
              value="install"
              className="mt-4 rounded-lg border border-border bg-card p-5"
            >
              <InstallSnippet publicKey={workspace?.publicKey} />
            </TabsContent>
          </Tabs>
        </div>

        {/* ---- Live preview ---- */}
        <LivePreview publicKey={workspace?.publicKey} draft={draft} />
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs font-medium text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  compact,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className={compact ? "text-sm" : "text-sm font-medium"}>{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function FaqEditor({
  faq,
  onChange,
}: {
  faq: FaqEntry[];
  onChange: (faq: FaqEntry[]) => void;
}) {
  const add = () => onChange([...faq, { question: "", answer: "" }]);
  const remove = (i: number) => onChange(faq.filter((_, idx) => idx !== i));
  const edit = (i: number, key: keyof FaqEntry, value: string) =>
    onChange(faq.map((f, idx) => (idx === i ? { ...f, [key]: value } : f)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">FAQ entries</p>
          <p className="text-xs text-muted-foreground">
            Quick answers shown in the widget before a visitor reaches out.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      {faq.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          No FAQ entries yet.
        </p>
      ) : (
        faq.map((entry, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                value={entry.question}
                onChange={(e) => edit(i, "question", e.target.value)}
                placeholder="Question"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
                aria-label="Remove FAQ"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Textarea
              value={entry.answer}
              onChange={(e) => edit(i, "answer", e.target.value)}
              placeholder="Answer"
              rows={2}
            />
          </div>
        ))
      )}
    </div>
  );
}

function InstallSnippet({ publicKey }: { publicKey?: string }) {
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  const snippet = useMemo(() => {
    const key = publicKey ?? "pk_xxxxxxxx";
    return `<script
  async
  src="${origin}/embed.js"
  data-zencom-key="${key}"
></script>`;
  }, [origin, publicKey]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("Snippet copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">Install on your site</h3>
        <p className="text-xs text-muted-foreground">
          Paste this snippet before the closing{" "}
          <code className="rounded bg-muted px-1">&lt;/body&gt;</code> tag on
          every page.
        </p>
      </div>
      <div className="relative">
        <pre className="overflow-x-auto rounded-md border border-border bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
          <code>{snippet}</code>
        </pre>
        <Button
          variant="secondary"
          size="sm"
          className="absolute right-2 top-2"
          onClick={onCopy}
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function LivePreview({
  publicKey,
  draft,
}: {
  publicKey?: string;
  draft: WidgetConfig;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  // Push the draft config into the preview iframe whenever it changes.
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win || !ready) return;
    win.postMessage({ type: "zencom:preview-config", config: draft }, "*");
  }, [draft, ready]);

  // The widget posts a ready signal once mounted; resend on load too.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "zencom:widget-ready") setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const src = publicKey
    ? `/widget?key=${encodeURIComponent(publicKey)}&preview=1`
    : undefined;

  return (
    <div className="lg:sticky lg:top-6 lg:self-start">
      <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/40 to-muted/10">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-xs text-muted-foreground">
            Live preview
          </span>
        </div>
        <div className="h-[560px] w-full bg-white dark:bg-zinc-900">
          {src ? (
            <iframe
              ref={iframeRef}
              src={src}
              title="Widget preview"
              onLoad={() => {
                // In case the ready signal was missed, mark ready on load.
                setReady(true);
              }}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
