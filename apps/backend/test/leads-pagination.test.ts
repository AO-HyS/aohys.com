import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin } = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({ email: "admin@example.com" })),
}));

vi.mock("../convex/auth.js", () => ({ requireAdmin }));

import * as leadFunctions from "../convex/leads.js";

interface PaginatedLeadQueryHandler {
  _handler: (
    context: { db: unknown },
    args: { paginationOpts: { numItems: number; cursor: string | null; maximumRowsRead?: number; maximumBytesRead?: number } },
  ) => Promise<{ page: Array<{ id: string }>; isDone: boolean; continueCursor: string }>;
}

function listHandler() {
  return (leadFunctions.listForDashboard as unknown as PaginatedLeadQueryHandler)._handler;
}

describe("dashboard lead pagination", () => {
  beforeEach(() => requireAdmin.mockClear());

  it("uses the newest-first cursor index and bounds every database page", async () => {
    const paginate = vi.fn(async () => ({
      page: [{
        _id: "lead_1",
        _creationTime: 1,
        name: "Private lead",
        email: "private@example.com",
        preferredContactPath: "email",
        consentToContact: true,
        intent: "project",
        message: "Private message",
        sourcePath: "/contact",
        locale: "en",
        status: "new",
        spamSignals: {},
        createdAt: 2,
        updatedAt: 2,
      }],
      isDone: false,
      continueCursor: "cursor_next",
    }));
    const order = vi.fn(() => ({ paginate }));
    const withIndex = vi.fn(() => ({ order }));
    const query = vi.fn(() => ({ withIndex }));

    const result = await listHandler()({ db: { query } }, {
      paginationOpts: {
        numItems: 12,
        cursor: null,
        maximumRowsRead: 10_000,
        maximumBytesRead: 10_000_000,
      },
    });

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledWith("leads");
    expect(withIndex).toHaveBeenCalledWith("by_created_at");
    expect(order).toHaveBeenCalledWith("desc");
    expect(paginate).toHaveBeenCalledWith({
      numItems: 12,
      cursor: null,
      maximumRowsRead: 100,
      maximumBytesRead: 1_000_000,
    });
    expect(result).toMatchObject({
      isDone: false,
      continueCursor: "cursor_next",
      page: [{ id: "lead_1", status: "new" }],
    });
  });
});
