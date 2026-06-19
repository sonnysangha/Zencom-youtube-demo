"use client";

import { useState } from "react";
import { usePaginatedQuery, useQuery, useMutation, useConvex } from "convex/react";
import {
  ArrowUpDown,
  Contact,
  Download,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNowStrict } from "@/lib/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type LeadStatus = "new" | "contacted" | "closed";
type StatusFilter = LeadStatus | "all";
type Sort = "newest" | "oldest" | "name";

type Lead = {
  _id: Id<"leads">;
  _creationTime: number;
  orgId: string;
  name: string;
  email: string;
  phone?: string;
  status: LeadStatus;
  source: string;
  conversationId?: Id<"conversations">;
  visitorId?: Id<"visitorSessions">;
  notes?: string;
};

const STATUS_META: Record<
  LeadStatus,
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className:
      "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
  },
  contacted: {
    label: "Contacted",
    className:
      "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  },
  closed: {
    label: "Closed",
    className:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  },
};

export function LeadsClient() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [source, setSource] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const stats = useQuery(api.leads.leadStats);

  const queryArgs = {
    status: status === "all" ? undefined : status,
    source: source === "all" ? undefined : source,
    search: search || undefined,
    sort,
  };

  const { results, status: pageStatus, loadMore } = usePaginatedQuery(
    api.leads.listLeads,
    queryArgs,
    { initialNumItems: 25 },
  );

  const leads = results as Lead[];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Contact className="size-6 text-primary" />
            Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contacts captured from your widget and added manually. Track them
            from new to closed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton status={status === "all" ? undefined : status} />
          <AddLeadDialog />
        </div>
      </header>

      {/* Stat chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats?.total} />
        <StatCard label="New" value={stats?.new} accent="text-sky-500" />
        <StatCard
          label="Contacted"
          value={stats?.contacted}
          accent="text-amber-500"
        />
        <StatCard
          label="Closed"
          value={stats?.closed}
          accent="text-emerald-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative flex-1 min-w-[220px]"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone…"
            className="pl-8"
          />
        </form>

        <Select
          value={status}
          onValueChange={(v) => setStatus(v as StatusFilter)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {(stats?.sources ?? []).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="w-[150px]">
            <ArrowUpDown className="size-3.5" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Phone</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Added</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageStatus === "LoadingFirstPage" ? (
              <SkeletonRows />
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No leads match these filters yet.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => <LeadRow key={lead._id} lead={lead} />)
            )}
          </TableBody>
        </Table>
      </div>

      {pageStatus === "CanLoadMore" && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => loadMore(25)}>
            Load more
          </Button>
        </div>
      )}
      {pageStatus === "LoadingMore" && (
        <div className="flex justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | undefined;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ?? ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  const updateStatus = useMutation(api.leads.updateLeadStatus);
  const deleteLead = useMutation(api.leads.deleteLead);
  const [pending, setPending] = useState(false);

  const onStatusChange = async (next: LeadStatus) => {
    setPending(true);
    try {
      await updateStatus({ leadId: lead._id, status: next });
    } catch {
      toast.error("Couldn't update status");
    } finally {
      setPending(false);
    }
  };

  const onDelete = async () => {
    try {
      await deleteLead({ leadId: lead._id });
      toast.success("Lead deleted");
    } catch {
      toast.error("Couldn't delete lead");
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        {lead.name || "—"}
        <span className="block text-xs text-muted-foreground md:hidden">
          {lead.email}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">
        {lead.email || "—"}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground">
        {lead.phone || "—"}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="secondary" className="font-normal capitalize">
          {lead.source}
        </Badge>
      </TableCell>
      <TableCell>
        <Select
          value={lead.status}
          onValueChange={(v) => onStatusChange(v as LeadStatus)}
          disabled={pending}
        >
          <SelectTrigger
            className={`h-7 w-[120px] border px-2 text-xs font-medium ${STATUS_META[lead.status].className}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
        {formatDistanceToNowStrict(lead._creationTime)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete lead"
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ExportButton({ status }: { status?: LeadStatus }) {
  const convex = useConvex();
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    try {
      const rows = await convex.query(api.leads.exportLeads, { status });
      if (rows.length === 0) {
        toast.info("No leads to export");
        return;
      }
      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} lead${rows.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={onExport} disabled={busy}>
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      Export CSV
    </Button>
  );
}

function AddLeadDialog() {
  const createLead = useMutation(api.leads.createLead);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      await createLead({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Lead added");
      reset();
      setOpen(false);
    } catch {
      toast.error("Couldn't add lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
          <DialogDescription>
            Manually record a contact. They&apos;ll start in the “New” stage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-name">Name</Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lead-email">Email</Label>
            <Input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lead-phone">Phone (optional)</Label>
            <Input
              id="lead-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lead-notes">Notes (optional)</Label>
            <Textarea
              id="lead-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Add lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 w-full max-w-[120px] animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function toCsv(rows: Lead[]): string {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Status",
    "Source",
    "Notes",
    "Created",
  ];
  const escape = (val: string) => {
    const s = val ?? "";
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      escape(r.name),
      escape(r.email),
      escape(r.phone ?? ""),
      escape(r.status),
      escape(r.source),
      escape(r.notes ?? ""),
      escape(new Date(r._creationTime).toISOString()),
    ].join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}
