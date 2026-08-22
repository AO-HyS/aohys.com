export type DashboardLeadStatus = "new" | "reviewing" | "closed";

export interface DashboardLead {
  id: Id<"leads">;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  preferredContactPath?: "email" | "whatsapp";
  consentToContact?: boolean;
  intent: string;
  message: string;
  sourcePath: string;
  locale: "en" | "es";
  referrer?: string;
  status: DashboardLeadStatus;
  createdAt: number;
  updatedAt: number;
}
import type { Id } from "@aohys/backend/convex/_generated/dataModel";
