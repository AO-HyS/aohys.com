import { Link } from "@tanstack/react-router";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  CloudOffIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useDashboardOverview } from "@/api";
import { Action } from "@/components/dashboard/action";
import { AsyncSurface } from "@/components/dashboard/async-surface";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionPanel } from "@/components/dashboard/section-panel";
import { StatusBadge, type StatusTone } from "@/components/dashboard/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type DashboardOverview = NonNullable<ReturnType<typeof useDashboardOverview>>;
type OverviewGate = DashboardOverview["gates"][number];

const stateCopy = {
  clear: {
    title: "The workspace is clear.",
    description: "No unpublished project or resume work is waiting. Review a source surface when you want to prepare the next release.",
    label: "No release work waiting",
    tone: "neutral",
  },
  "action-required": {
    title: "One trustworthy action at a time.",
    description: "The readiness contract found work that must be completed before the next publication request can be trusted.",
    label: "Action required",
    tone: "attention",
  },
  "ready-to-queue": {
    title: "Content is ready for deliberate review.",
    description: "The current drafts satisfy the bounded readiness gates. Open the source surface to review and explicitly queue publication.",
    label: "Ready to queue",
    tone: "success",
  },
  partial: {
    title: "Readiness is intentionally partial.",
    description: "The bounded query reached a safety limit, so this workspace will not make a complete publication claim.",
    label: "Partial evidence",
    tone: "attention",
  },
} as const satisfies Record<DashboardOverview["state"], {
  title: string;
  description: string;
  label: string;
  tone: StatusTone;
}>;

const gatePresentation = {
  clear: { tone: "neutral", icon: CircleDotIcon },
  ready: { tone: "success", icon: CheckCircle2Icon },
  blocked: { tone: "attention", icon: AlertTriangleIcon },
  unavailable: { tone: "danger", icon: CloudOffIcon },
} as const satisfies Record<OverviewGate["status"], { tone: StatusTone; icon: typeof CircleDotIcon }>;

export function DashboardHome() {
  const overview = useDashboardOverview();

  if (!overview) {
    return (
      <section className="flex flex-col gap-5">
        <PageHeader
          title="Checking publication readiness"
          description="Reading bounded operational gates from Convex without loading private draft content into this surface."
        />
        <AsyncSurface state="loading" title="Checking publication readiness" />
      </section>
    );
  }

  return <DashboardOverviewContent overview={overview} />;
}

export function DashboardOverviewContent({ overview }: { overview: DashboardOverview }) {
  const copy = stateCopy[overview.state];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={overview.nextAction ? (
          <Action asChild>
            <Link to={overview.nextAction.path}>
              {overview.nextAction.label}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Action>
        ) : undefined}
      />

      <section aria-label="Release truth" className="grid border-y sm:grid-cols-2 xl:grid-cols-4">
        <TruthCell label="Overall" value={copy.label} tone={copy.tone} />
        <TruthCell
          label="Release provider"
          value={overview.release.providerState === "configured" ? "Configured" : "Unavailable"}
          tone={overview.release.providerState === "configured" ? "success" : "danger"}
        />
        <TruthCell label="Workflow request" value="Not requested" tone="neutral" />
        <TruthCell label="Deployment proof" value="Unknown" tone="neutral" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)] xl:items-start">
        <SectionPanel
          title="Readiness gates"
          description="Deterministic checks from bounded Convex reads. Each action returns to the owning source surface."
          actions={<StatusBadge tone={copy.tone}>{copy.label}</StatusBadge>}
        >
          <ol className="divide-y" aria-label="Publication readiness gates">
            {overview.gates.map((gate) => <ReadinessGate key={gate.id} gate={gate} />)}
          </ol>
        </SectionPanel>

        <div className="flex flex-col gap-5">
          <SectionPanel
            title="Next trustworthy action"
            description="The first actionable blocker wins. Provider-only configuration never pretends to be a dashboard task."
          >
            {overview.nextAction ? (
              <div className="flex flex-col items-start gap-4">
                <p className="font-body leading-6 text-muted-foreground">{overview.nextAction.reason}</p>
                <Action asChild variant="secondary">
                  <Link to={overview.nextAction.path}>
                    {overview.nextAction.label}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Action>
              </div>
            ) : (
              <p className="font-body leading-6 text-muted-foreground">
                There is no corrective dashboard action right now. Start the next draft from its source surface.
              </p>
            )}
          </SectionPanel>

          <Alert className="p-4" variant={overview.release.providerState === "unavailable" ? "destructive" : "default"}>
            <ShieldCheckIcon aria-hidden="true" />
            <AlertTitle>Publication truth stays literal</AlertTitle>
            <AlertDescription className="font-body leading-6">
              Ready to queue is not workflow queued. Workflow queued is not deployment verified. This surface reports the latter as unknown until authoritative receipts exist.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

function TruthCell({ label, value, tone }: { label: string; value: string; tone: StatusTone }) {
  return (
    <div className="flex min-h-24 flex-col items-start justify-center gap-2 border-b px-4 py-4 last:border-b-0 xl:border-b-0 xl:not-first:border-l">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <StatusBadge tone={tone}>{value}</StatusBadge>
    </div>
  );
}

function ReadinessGate({ gate }: { gate: OverviewGate }) {
  const presentation = gatePresentation[gate.status];
  const Icon = presentation.icon;

  return (
    <li className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border bg-muted/40">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-sm font-semibold">{gate.label}</h3>
            <StatusBadge tone={presentation.tone}>{gate.status}</StatusBadge>
          </div>
          <p className="mt-1 max-w-[68ch] font-body text-sm leading-6 text-muted-foreground">{gate.reason}</p>
        </div>
      </div>
      {gate.actionPath && gate.actionLabel ? (
        <Action asChild variant="secondary" className="w-fit sm:mt-0">
          <Link to={gate.actionPath}>{gate.actionLabel}</Link>
        </Action>
      ) : null}
    </li>
  );
}
