import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  LoaderCircleIcon,
  SaveIcon,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { loadDashboardLeads, saveLeadStatus } from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardLead, DashboardLeadStatus } from "@/types";

const statuses: DashboardLeadStatus[] = ["new", "reviewing", "closed"];

export function LeadsScreen() {
  const [leads, setLeads] = useState<DashboardLead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  async function refresh() {
    setError(null);
    try {
      const payload = await loadDashboardLeads();
      setLeads(payload.leads);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Leads could not load.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function updateStatus(leadId: string, status: DashboardLeadStatus) {
    setSavingLeadId(leadId);
    const toastId = toast.loading("Saving lead status", {
      description: `Moving this lead to ${formatLeadStatus(status)}.`,
    });

    try {
      await saveLeadStatus(leadId, status);
      await refresh();
      toast.success("Lead status saved", {
        id: toastId,
        description: "The inbox is up to date.",
      });
    } catch (saveError) {
      toast.error("Lead status failed", {
        id: toastId,
        description: saveError instanceof Error ? saveError.message : "Lead status could not be saved.",
      });
    } finally {
      setSavingLeadId(null);
    }
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <Badge className="w-fit" variant="secondary">Leads</Badge>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Lead inbox</h1>
          <p className="max-w-3xl text-muted-foreground">
            Review contact requests and keep follow-up status visible.
          </p>
        </div>
      </section>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Lead data problem</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Incoming leads</CardTitle>
          <CardDescription>{leads ? `${leads.length} stored lead${leads.length === 1 ? "" : "s"} · sorted and paginated locally` : "Loading leads"}</CardDescription>
        </CardHeader>
        <CardContent>
          {!leads ? (
            <Skeleton className="h-56 w-full" />
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <LeadTable
              leads={leads}
              savingLeadId={savingLeadId}
              sorting={sorting}
              onSortingChange={setSorting}
              onSave={updateStatus}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function LeadTable({
  leads,
  savingLeadId,
  sorting,
  onSortingChange,
  onSave,
}: {
  leads: DashboardLead[];
  savingLeadId: string | null;
  sorting: SortingState;
  onSortingChange: Dispatch<SetStateAction<SortingState>>;
  onSave: (leadId: string, status: DashboardLeadStatus) => void | Promise<void>;
}) {
  const columns = useMemo<ColumnDef<DashboardLead>[]>(
    () => [
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Lead",
        cell: ({ row }) => (
          <div className="flex min-w-48 flex-col gap-1">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
            {row.original.phone ? <span className="text-xs text-muted-foreground">{row.original.phone}</span> : null}
          </div>
        ),
      },
      {
        accessorKey: "intent",
        header: "Intent",
        cell: ({ row }) => <Badge variant="secondary">{row.original.intent}</Badge>,
      },
      {
        accessorKey: "message",
        header: "Message",
        cell: ({ row }) => (
          <p className="line-clamp-3 max-w-xl text-sm text-muted-foreground">
            {row.original.message}
          </p>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <LeadStatusControl
            lead={row.original}
            isSaving={savingLeadId === row.original.id}
            onSave={onSave}
          />
        ),
      },
    ],
    [onSave, savingLeadId],
  );
  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg">
        <Table className="min-w-[960px] table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={leadColumnClass(header.id)}>
                    {header.isPlaceholder ? null : (
                      <button
                        className="inline-flex min-h-10 items-center gap-1 text-left font-medium"
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" ? "↑" : header.column.getIsSorted() === "desc" ? "↓" : null}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
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
      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · showing {table.getRowModel().rows.length} of {leads.length}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label="First page">
            <ChevronsLeftIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
            <ChevronRightIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} aria-label="Last page">
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

function leadColumnClass(columnId: string): string {
  switch (columnId) {
    case "createdAt":
      return "w-32";
    case "name":
      return "w-56";
    case "intent":
      return "w-24";
    case "status":
      return "w-56";
    default:
      return "w-auto";
  }
}

function LeadStatusControl({
  lead,
  isSaving,
  onSave,
}: {
  lead: DashboardLead;
  isSaving: boolean;
  onSave: (leadId: string, status: DashboardLeadStatus) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<DashboardLeadStatus>(lead.status);

  useEffect(() => {
    setStatus(lead.status);
  }, [lead.status]);

  return (
    <div className="flex min-w-0 items-center justify-start gap-2">
        <Select value={status} onValueChange={(value) => setStatus(value as DashboardLeadStatus)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {statuses.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={status === lead.status ? "outline" : "default"}
          disabled={isSaving || status === lead.status}
          onClick={() => void onSave(lead.id, status)}
        >
          {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
          Save
        </Button>
    </div>
  );
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
  const labels: Record<DashboardLeadStatus, string> = {
    new: "New",
    reviewing: "Reviewing",
    closed: "Closed",
  };

  return labels[value];
}
