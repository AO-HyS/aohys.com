import { validateCloudflareImagesCustomId } from "@aohys/core";
import {
  parseCloudflareImagesUploadResponse,
  parseGitHubErrorResponse,
} from "./provider-responses.js";
import {
  type Environment,
  type Locale,
  type MediaUsage,
} from "@aohys/core/domain";

export {
  normalizeCloudflareImagesCustomId,
  validateCloudflareImagesCustomId,
} from "@aohys/core";
export type { CloudflareImagesCustomIdValidation } from "@aohys/core";

export interface DashboardMediaUploadPayload {
  storageKey: string;
  altText: string;
  contentId?: string;
  usage: MediaUsage;
  locale?: Locale;
  selectedForPublic?: boolean;
}

export interface CloudflareImagesDirectUploadConfig {
  accountHash?: string;
  accountId?: string;
  apiToken?: string;
}

export interface CloudflareImagesDirectUploadResult {
  imageId: string;
  publicUrl: string;
  uploadURL: string;
}

export interface GitHubPublishWorkflowConfig {
  environment: Environment;
  repository?: string;
  token?: string;
  workflowId?: string;
}

export type PublishWorkflowResult =
  | { status: "queued"; repository: string; workflowId: string; ref: string }
  | { status: "not-configured"; reason: string };

// A failure known to have produced no upload URL: rejected before the request
// or by Cloudflare's parsed error response. Any other error after the request
// leaves the outcome unknown.
export class ConfirmedProviderFailure extends Error {}

export async function createCloudflareImagesDirectUpload(
  payload: DashboardMediaUploadPayload,
  config: CloudflareImagesDirectUploadConfig,
  providerFetch: typeof fetch = fetch,
): Promise<CloudflareImagesDirectUploadResult> {
  const accountId = config.accountId?.trim();
  const apiToken = config.apiToken?.trim();
  const accountHash = config.accountHash?.trim();

  if (!accountId || !apiToken || !accountHash) {
    throw new ConfirmedProviderFailure(
      "Cloudflare Images upload is not configured.",
    );
  }

  const customId = validateCloudflareImagesCustomId(payload.storageKey);

  if (!customId.isValid) {
    throw new ConfirmedProviderFailure(
      `Cloudflare Images custom ID is invalid. ${customId.message}`,
    );
  }

  const form = new FormData();
  form.set("id", customId.value);
  form.set("requireSignedURLs", "false");
  form.set(
    "metadata",
    JSON.stringify({
      altText: payload.altText,
      contentId: payload.contentId,
      locale: payload.locale,
      usage: payload.usage,
    }),
  );

  const response = await providerFetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
      },
      body: form,
    },
  );
  const body = parseCloudflareImagesUploadResponse(await response.json());

  if (!response.ok || !body.success) {
    const providerMessage = body.errors.join(" ");
    throw new ConfirmedProviderFailure(
      providerMessage || "Cloudflare Images upload URL could not be created.",
    );
  }
  // A success without the image fields may have created the image: unknown.
  if (!body.imageId || !body.uploadURL) {
    throw new Error("Cloudflare Images returned an incomplete upload URL.");
  }

  return {
    imageId: body.imageId,
    publicUrl: `https://imagedelivery.net/${accountHash}/${body.imageId}/public`,
    uploadURL: body.uploadURL,
  };
}

export async function triggerGitHubPublishWorkflow(
  config: GitHubPublishWorkflowConfig,
  providerFetch: typeof fetch = fetch,
): Promise<PublishWorkflowResult> {
  const token = config.token?.trim();
  const repository = config.repository?.trim() || "AO-HyS/aohys.com";
  const workflowId = config.workflowId?.trim() || "release-train.yml";
  const ref = config.environment === "production" ? "main" : "develop";

  if (!token) {
    return {
      status: "not-configured",
      reason: "PUBLISH_GITHUB_TOKEN is missing.",
    };
  }

  const response = await providerFetch(
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
        inputs: {
          target_environment:
            config.environment === "production" ? "production" : "preview",
        },
      }),
    },
  );

  if (response.status !== 204) {
    let message = "GitHub publish workflow could not be queued.";

    try {
      const body = parseGitHubErrorResponse(await response.json());
      message = body.message ?? message;
    } catch {
      // Keep the generic provider message.
    }

    throw new Error(message);
  }

  return {
    status: "queued",
    repository,
    workflowId,
    ref,
  };
}
