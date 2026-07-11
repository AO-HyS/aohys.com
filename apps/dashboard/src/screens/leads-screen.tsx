import { useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, EyeIcon, SaveIcon } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useDashboardLeads, useSaveLeadStatus } from "@/api";
import { Action, AsyncSurface, PageHeader, SectionPanel, StatusBadge } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { captureDashboardAction } from "@/lib/analytics";
import type { DashboardLead, DashboardLeadStatus } from "@/types";

const statuses: DashboardLeadStatus[] = ["new", "reviewing", "closed"];

export function LeadsScreen() {
  return <LiveLeadsScreen />;
}

function LiveLeadsScreen() {
  const { results, status, loadMore } = useDashboardLeads();
  const saveLeadStatus = useSaveLeadStatus();

  return (
    <LeadsWorkspace
      leads={results}
      paginationStatus={status}
      loadMore={loadMore}
      saveLeadStatus={saveLeadStatus}
    />
  );
}

function LeadsWorkspace({
  leads,
  paginationStatus,
  loadMore,
  saveLeadStatus,
}: {
  leads: DashboardLead[];
  paginationStatus: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (count: number) => void;
  saveLeadStatus: (leadId: string, status: DashboardLeadStatus) => Promise<unknown>;
}) {
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? leads[0];
  const isFirstPageLoading = paginationStatus === "LoadingFirstPage";

  async function updateStatus(leadId: string, status: DashboardLeadStatus) {
    const previousStatus = leads.find((lead) => lead.id === leadId)?.status;
    setSavingLeadId(leadId);
    const toastId = toast.loading("Saving lead status", {
      description: `Moving this lead to ${formatLeadStatus(status)}.`,
    });

    try {
      await saveLeadStatus(leadId, status);
      captureDashboardAction("succeeded", "leads", "update_lead_status", {
        ...(previousStatus ? { from_status: previousStatus } : {}),
        to_status: status,
      });
      toast.success("Lead status saved", { id: toastId, description: "The inbox is up to date." });
    } catch (saveError) {
      captureDashboardAction("failed", "leads", "update_lead_status", {
        error_type: saveError instanceof Error ? saveError.name : "UnknownError",
        ...(previousStatus ? { from_status: previousStatus } : {}),
        to_status: status,
      });
      toast.error("Lead status failed", {
        id: toastId,
        description: saveError instanceof Error ? saveError.message : "Lead status could not be saved.",
      });
    } finally {
      setSavingLeadId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lead inbox"
        description="Review each private contact request, decide the next step, and keep follow-up status explicit."
      />

      <SectionPanel
        title="Incoming leads"
        description={isFirstPageLoading
          ? "Loading the first server page."
          : `${leads.length} lead${leads.length === 1 ? "" : "s"} loaded${paginationStatus === "Exhausted" ? " · all records reached" : " · more may be available"}.`}
      >
        {isFirstPageLoading ? (
          <AsyncSurface state="loading" title="Loading lead inbox" />
        ) : leads.length === 0 ? (
          <AsyncSurface
            state="empty"
            title="No contact requests yet"
            description="New submissions will appear here in newest-first order."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.75fr)]">
            <LeadCollection
              leads={leads}
              selectedLeadId={selectedLead?.id}
              onSelect={setSelectedLeadId}
            />
            {selectedLead ? (
              <LeadDetail
                key={`${selectedLead.id}:${selectedLead.status}`}
                lead={selectedLead}
                isSaving={savingLeadId === selectedLead.id}
                onSave={updateStatus}
              />
            ) : null}
          </div>
        )}

        {!isFirstPageLoading && leads.length > 0 ? (
          <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {paginationStatus === "Exhausted"
                ? `All ${leads.length} available leads are loaded.`
                : `${leads.length} leads loaded. Load the next server page when needed.`}
            </p>
            {paginationStatus !== "Exhausted" ? (
              <Action
                variant="secondary"
                pending={paginationStatus === "LoadingMore"}
                pendingLabel="Loading more…"
                onClick={() => loadMore(12)}
              >
                Load more leads
              </Action>
            ) : null}
          </div>
        ) : null}
      </SectionPanel>
    </div>
  );
}

function LeadCollection({
  leads,
  selectedLeadId,
  onSelect,
}: {
  leads: DashboardLead[];
  selectedLeadId?: string;
  onSelect: (leadId: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {leads.map((lead) => (
          <article
            key={lead.id}
            className={`rounded-xl border p-4 ${lead.id === selectedLeadId ? "border-foreground bg-primary/15" : "bg-card"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{lead.name}</p>
                <p className="truncate text-sm text-muted-foreground">{lead.email}</p>
              </div>
              <StatusBadge tone={leadStatusTone(lead.status)}>{formatLeadStatus(lead.status)}</StatusBadge>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</p>
              <Action variant="secondary" onClick={() => onSelect(lead.id)} aria-label={`Review lead from ${lead.name}`}>
                <EyeIcon data-icon="inline-start" />
                Review
              </Action>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden md:block">
        <LeadTable leads={leads} selectedLeadId={selectedLeadId} onSelect={onSelect} />
      </div>
    </>
  );
}

function LeadTable({
  leads,
  selectedLeadId,
  onSelect,
}: {
  leads: DashboardLead[];
  selectedLeadId?: string;
  onSelect: (leadId: string) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const columns = useMemo<ColumnDef<DashboardLead>[]>(() => [
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
    },
    {
      accessorKey: "name",
      header: "Lead",
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium">{row.original.name}</span>
          <span className="truncate text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "intent",
      header: "Intent",
      cell: ({ row }) => <Badge variant="secondary">{formatIntent(row.original.intent)}</Badge>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={leadStatusTone(row.original.status)}>{formatLeadStatus(row.original.status)}</StatusBadge>
      ),
    },
    {
      id: "review",
      enableSorting: false,
      header: "Action",
      cell: ({ row }) => (
        <Action variant="secondary" onClick={() => onSelect(row.original.id)} aria-label={`Review lead from ${row.original.name}`}>
          Review
        </Action>
      ),
    },
  ], [onSelect]);
  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table className="table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={leadColumnClass(header.id)}
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="inline-flex min-h-11 items-center gap-1 text-left font-medium"
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? <ArrowUpIcon className="size-3.5" aria-hidden="true" /> : null}
                        {sorted === "desc" ? <ArrowDownIcon className="size-3.5" aria-hidden="true" /> : null}
                      </button>
                    ) : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.original.id === selectedLeadId ? "selected" : undefined}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={leadColumnClass(cell.column.id)}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LeadDetail({
  lead,
  isSaving,
  onSave,
}: {
  lead: DashboardLead;
  isSaving: boolean;
  onSave: (leadId: string, status: DashboardLeadStatus) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<DashboardLeadStatus>(lead.status);

  return (
    <aside className="h-fit rounded-xl border bg-card p-5 xl:sticky xl:top-6" aria-labelledby="lead-detail-title">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Focused review</p>
        <h2 id="lead-detail-title" className="text-xl font-semibold">{lead.name}</h2>
        <a className="break-all text-sm underline decoration-primary decoration-2 underline-offset-4" href={`mailto:${lead.email}`}>
          {lead.email}
        </a>
        {lead.phone ? <a className="text-sm underline underline-offset-4" href={`tel:${lead.phone}`}>{lead.phone}</a> : null}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-muted-foreground">Intent</dt><dd className="font-medium">{formatIntent(lead.intent)}</dd></div>
        <div><dt className="text-muted-foreground">Locale</dt><dd className="font-medium uppercase">{lead.locale}</dd></div>
        <div><dt className="text-muted-foreground">Contact path</dt><dd className="font-medium">{lead.preferredContactPath ?? "Not set"}</dd></div>
        <div><dt className="text-muted-foreground">Received</dt><dd className="font-medium">{formatDate(lead.createdAt)}</dd></div>
      </dl>

      <div className="mt-5 rounded-lg bg-muted/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Message</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{lead.message}</p>
      </div>

      <div className="mt-5 flex flex-col gap-2 border-t pt-5">
        <label className="text-sm font-medium" htmlFor={`lead-status-${lead.id}`}>Follow-up status</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={status} onValueChange={(value) => setStatus(value as DashboardLeadStatus)}>
            <SelectTrigger id={`lead-status-${lead.id}`} className="min-h-11 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statuses.map((item) => <SelectItem key={item} value={item}>{formatLeadStatus(item)}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Action
            pending={isSaving}
            pendingLabel="Saving…"
            disabled={status === lead.status}
            onClick={() => void onSave(lead.id, status)}
          >
            <SaveIcon data-icon="inline-start" />
            Save status
          </Action>
        </div>
      </div>
    </aside>
  );
}

function leadColumnClass(columnId: string): string {
  switch (columnId) {
    case "createdAt": return "w-32";
    case "name": return "w-[34%]";
    case "intent": return "w-36";
    case "status": return "w-28";
    case "review": return "w-24";
    default: return "w-auto";
  }
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatLeadStatus(value: DashboardLeadStatus): string {
  return { new: "New", reviewing: "Reviewing", closed: "Closed" }[value];
}

function leadStatusTone(value: DashboardLeadStatus): "neutral" | "attention" | "success" {
  return { new: "attention", reviewing: "neutral", closed: "success" }[value] as "neutral" | "attention" | "success";
}

function formatIntent(value: string): string {
  return value.split("-").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
}
