import { validateCloudflareImagesCustomId } from "@aohys/core";
import { parseCloudflareImagesUploadResponse } from "./provider-responses.js";
import { type Locale, type MediaUsage } from "@aohys/core/domain";

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
