import { assertOneOf, trimToUndefined } from "@aohys/core";
import {
  LEAD_INTENTS,
  LOCALES,
  type LeadIntent,
  type Locale,
} from "@aohys/core/domain";

export interface LeadIntakeInput {
  name: string;
  email: string;
  company?: string;
  intent: LeadIntent;
  message: string;
  sourcePath: string;
  locale: Locale;
  referrer?: string;
}

export interface PreparedLeadIntake {
  name: string;
  email: string;
  company?: string;
  intent: LeadIntent;
  message: string;
  sourcePath: string;
  locale: Locale;
  referrer?: string;
  status: "new";
  createdAt: number;
  updatedAt: number;
}

interface PrepareLeadOptions {
  now?: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function prepareLeadIntake(
  input: LeadIntakeInput,
  options: PrepareLeadOptions = {},
): PreparedLeadIntake {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const message = input.message.trim();
  const sourcePath = input.sourcePath.trim();
  const company = trimToUndefined(input.company);
  const referrer = trimToUndefined(input.referrer);

  assertOneOf(input.intent, LEAD_INTENTS, "intent");
  assertOneOf(input.locale, LOCALES, "locale");

  if (name.length < 2 || name.length > 120) {
    throw new Error("name must be between 2 and 120 characters.");
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new Error("email must be valid.");
  }

  if (company && company.length > 160) {
    throw new Error("company must be 160 characters or less.");
  }

  if (message.length < 10 || message.length > 4000) {
    throw new Error("message must be between 10 and 4000 characters.");
  }

  if (!sourcePath.startsWith("/") || sourcePath.length > 240) {
    throw new Error("sourcePath must be a local path.");
  }

  if (referrer) {
    new URL(referrer);
  }

  const now = options.now ?? Date.now();

  return {
    name,
    email,
    ...(company ? { company } : {}),
    intent: input.intent,
    message,
    sourcePath,
    locale: input.locale,
    ...(referrer ? { referrer } : {}),
    status: "new",
    createdAt: now,
    updatedAt: now,
  };
}
