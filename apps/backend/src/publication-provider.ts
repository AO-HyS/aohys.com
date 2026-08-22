import type { PublicationTarget } from "./publication-contract.js";

export interface GitHubPublicationDispatch {
  targetEnvironment: PublicationTarget;
  publicationRequestKey: string;
  publicationAttemptId: string;
  repository?: string;
  token?: string;
  workflowId?: string;
}

export type GitHubPublicationDispatchResult =
  | {
      status: "acknowledged";
      repository: string;
      workflowId: string;
      ref: string;
      runId?: string;
      runUrl?: string;
    }
  | {
      status: "failed";
      retryable: boolean;
      code: string;
      message: string;
    }
  | {
      status: "ambiguous";
      retryable: false;
      code: string;
      message: string;
    };

export async function dispatchGitHubPublication(
  input: GitHubPublicationDispatch,
  providerFetch: typeof fetch = fetch,
): Promise<GitHubPublicationDispatchResult> {
  const token = input.token?.trim();
  if (!token) {
    return permanentFailure(
      "provider-not-configured",
      "GitHub publication provider is not configured.",
    );
  }
  const repository = input.repository?.trim() || "AO-HyS/aohys.com";
  const workflowId = input.workflowId?.trim() || "release-train.yml";
  const ref = input.targetEnvironment === "production" ? "main" : "develop";
  let response: Response;
  try {
    response = await providerFetch(
      `https://api.github.com/repos/${repository}/actions/workflows/${workflowId}/dispatches`,
      {
        method: "POST",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-github-api-version": "2022-11-28",
        },
        body: JSON.stringify({
          ref,
          return_run_details: true,
          inputs: {
            target_environment: input.targetEnvironment,
            publication_request_key: input.publicationRequestKey,
            publication_attempt_id: input.publicationAttemptId,
          },
        }),
      },
    );
  } catch {
    return ambiguousFailure(
      "provider-response-lost",
      "GitHub publication acknowledgement was not received.",
    );
  }

  if (response.status === 204) {
    return { status: "acknowledged", repository, workflowId, ref };
  }

  if (response.status === 200) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return ambiguousFailure(
        "provider-invalid-acknowledgement",
        "GitHub accepted the request but returned invalid run details.",
      );
    }
    const details = parseRunDetails(payload);
    if (!details) {
      return ambiguousFailure(
        "provider-invalid-acknowledgement",
        "GitHub accepted the request but returned invalid run details.",
      );
    }
    return { status: "acknowledged", repository, workflowId, ref, ...details };
  }

  if (response.status >= 500) {
    return ambiguousFailure(
      "provider-server-response",
      "GitHub may have accepted the publication request before failing.",
    );
  }
  if ([408, 409, 425, 429].includes(response.status)) {
    return {
      status: "failed",
      retryable: true,
      code: `provider-http-${response.status}`,
      message:
        "GitHub rejected the publication request with a retryable response.",
    };
  }
  return permanentFailure(
    `provider-http-${response.status}`,
    "GitHub rejected the publication request.",
  );
}

function parseRunDetails(value: unknown):
  | {
      runId: string;
      runUrl: string;
    }
  | undefined {
  if (!isRecord(value)) return undefined;
  const rawId = value.workflow_run_id;
  const runId =
    typeof rawId === "number" && Number.isSafeInteger(rawId)
      ? String(rawId)
      : typeof rawId === "string" && /^\d+$/.test(rawId)
        ? rawId
        : undefined;
  const runUrl =
    typeof value.html_url === "string"
      ? value.html_url
      : typeof value.run_url === "string"
        ? value.run_url
        : undefined;
  if (!runId || !runUrl || !/^https:\/\/(?:api\.)?github\.com\//.test(runUrl)) {
    return undefined;
  }
  return { runId, runUrl };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function permanentFailure(code: string, message: string) {
  return { status: "failed", retryable: false, code, message } as const;
}

function ambiguousFailure(code: string, message: string) {
  return { status: "ambiguous", retryable: false, code, message } as const;
}
