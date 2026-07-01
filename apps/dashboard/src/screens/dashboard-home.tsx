import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, BriefcaseBusinessIcon, FileTextIcon, InboxIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const cards = [
  {
    to: "/projects",
    title: "Projects",
    body: "Manage public story, SEO, CTA, proof images, achievements, and implementation notes.",
    icon: BriefcaseBusinessIcon,
  },
  {
    to: "/leads",
    title: "Leads",
    body: "Review contact requests and keep status current.",
    icon: InboxIcon,
  },
  {
    to: "/resume",
    title: "Resume",
    body: "Track public resume artifacts and hiring context.",
    icon: FileTextIcon,
  },
] as const;

export function DashboardHome() {
  return (
    <>
      <section className="flex flex-col gap-3">
        <Badge className="w-fit" variant="secondary">Private workspace</Badge>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Manage the public site from projects.
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            The Astro site stays static and SEO-focused. This React dashboard manages the private
            drafts, metadata, proof assets, leads, and resume artifacts that prepare changes for review.
          </p>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.to}>
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.body}</CardDescription>
                <CardAction>
                  <Icon />
                </CardAction>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link to={card.to}>
                    Open
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </>
  );
}
