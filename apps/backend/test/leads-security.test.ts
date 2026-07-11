import { describe, expect, it, vi } from "vitest";
import * as leadFunctions from "../convex/leads.js";
import {
  CONTACT_SUBMISSION_MAX_PER_WINDOW,
  CONTACT_SUBMISSION_RATE_LIMIT_MESSAGE,
  CONTACT_SUBMISSION_RATE_LIMIT_WINDOW_MS,
} from "../src/contact-abuse.js";

interface ContactMutationArgs {
  name: string;
  email: string;
  preferredContactPath: "email";
  consentToContact: true;
  intent: "project";
  message: string;
  sourcePath: string;
  locale: "en";
  status: "new";
  spamSignals: { elapsedMs?: number };
  createdAt: number;
  updatedAt: number;
}

interface ContactMutationHandler {
  _handler: (
    context: { db: unknown },
    args: ContactMutationArgs,
  ) => Promise<{ leadId: string }>;
}

const now = 1_788_000_003_500;
const validArgs: ContactMutationArgs = {
  name: "Alejandro Ortiz",
  email: "alejandro.ortiz@aohys.com",
  preferredContactPath: "email",
  consentToContact: true,
  intent: "project",
  message: "I need help shipping a product workflow.",
  sourcePath: "/contact",
  locale: "en",
  status: "new",
  spamSignals: {},
  createdAt: now,
  updatedAt: now,
};

function createDatabase(recentSubmissionCount: number) {
  const take = vi.fn(async () => Array.from({ length: recentSubmissionCount }, (_, index) => ({ id: index })));
  const gte = vi.fn(() => ({ take }));
  const eq = vi.fn(() => ({ gte }));
  const withIndex = vi.fn((_indexName: string, buildRange: (query: { eq: typeof eq }) => unknown) => {
    buildRange({ eq });

    return { take };
  });
  const query = vi.fn(() => ({ withIndex }));
  const insert = vi.fn(async () => "lead_new");

  return {
    db: { query, insert },
    eq,
    gte,
    insert,
    take,
    withIndex,
  };
}

function contactMutationHandler() {
  return (leadFunctions.createFromContact as unknown as ContactMutationHandler)._handler;
}

describe("lead intake security boundary", () => {
  it("does not expose the legacy anonymous submit mutation", () => {
    expect(leadFunctions).not.toHaveProperty("submit");
  });

  it("rejects a contact submission before persistence when the durable window is full", async () => {
    const database = createDatabase(CONTACT_SUBMISSION_MAX_PER_WINDOW);

    await expect(contactMutationHandler()({ db: database.db }, validArgs)).rejects.toThrow(
      CONTACT_SUBMISSION_RATE_LIMIT_MESSAGE,
    );
    expect(database.withIndex).toHaveBeenCalledWith("by_email_and_created_at", expect.any(Function));
    expect(database.eq).toHaveBeenCalledWith("email", validArgs.email);
    expect(database.gte).toHaveBeenCalledWith(
      "createdAt",
      now - CONTACT_SUBMISSION_RATE_LIMIT_WINDOW_MS,
    );
    expect(database.take).toHaveBeenCalledWith(CONTACT_SUBMISSION_MAX_PER_WINDOW);
    expect(database.insert).not.toHaveBeenCalled();
  });

  it("preserves legitimate contact persistence below the durable limit", async () => {
    const database = createDatabase(CONTACT_SUBMISSION_MAX_PER_WINDOW - 1);

    await expect(contactMutationHandler()({ db: database.db }, validArgs)).resolves.toEqual({
      leadId: "lead_new",
    });
    expect(database.insert).toHaveBeenCalledWith("leads", validArgs);
  });
});
