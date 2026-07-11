import { useId, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

export interface SectionPanelProps {
  title: string;
  description?: string;
  headingLevel?: 2 | 3 | 4;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function SectionPanel({
  title,
  description,
  headingLevel = 2,
  actions,
  children,
  footer,
  className,
}: SectionPanelProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const headingId = `section-${useId().replaceAll(":", "")}`;

  return (
    <section aria-labelledby={headingId} data-slot="section-panel" className={className}>
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="gap-1 border-b py-4 sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <Heading id={headingId} className="font-heading text-base font-semibold leading-snug">
              {title}
            </Heading>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </CardHeader>
        <CardContent className="py-5">{children}</CardContent>
        {footer ? <CardFooter className="border-t py-4">{footer}</CardFooter> : null}
      </Card>
    </section>
  );
}
