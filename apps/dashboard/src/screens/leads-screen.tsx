import { useEffect, useState } from "react";
import { LoaderCircleIcon, SaveIcon } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardLead, DashboardLeadStatus } from "@/types";

const statuses: DashboardLeadStatus[] = ["new", "reviewing", "closed"];

export function LeadsScreen() {
  const [leads, setLeads] = useState<DashboardLead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);

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
    try {
      await saveLeadStatus(leadId, status);
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Lead status could not be saved.");
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
          <CardDescription>{leads ? `${leads.length} stored lead${leads.length === 1 ? "" : "s"}` : "Loading leads"}</CardDescription>
        </CardHeader>
        <CardContent>
          {!leads ? (
            <Skeleton className="h-56 w-full" />
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    isSaving={savingLeadId === lead.id}
                    onSave={updateStatus}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function LeadRow({
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
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{lead.name}</span>
          <span className="text-xs text-muted-foreground">{lead.email}</span>
          {lead.phone ? <span className="text-xs text-muted-foreground">{lead.phone}</span> : null}
        </div>
      </TableCell>
      <TableCell>{lead.intent}</TableCell>
      <TableCell className="max-w-md text-muted-foreground">{lead.message}</TableCell>
      <TableCell>
        <Select value={status} onValueChange={(value) => setStatus(value as DashboardLeadStatus)}>
          <SelectTrigger className="w-36">
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
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" disabled={isSaving || status === lead.status} onClick={() => void onSave(lead.id, status)}>
          {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}
