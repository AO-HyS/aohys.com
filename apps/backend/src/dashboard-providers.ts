export type DashboardEnvironment = "local" | "preview" | "production";

export interface DashboardMediaUploadPayload {
  storageKey: string;
  altText: string;
  contentId?: string;
  usage: "case-study" | "resume" | "architecture" | "site";
  locale?: "en" | "es";
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

export interface CloudflareImagesCustomIdValidation {
  isValid: boolean;
  message?: string;
  value: string;
}

export interface GitHubPublishWorkflowConfig {
  environment: DashboardEnvironment;
  repository?: string;
  token?: string;
  workflowId?: string;
}

export type PublishWorkflowResult =
  | { status: "queued"; repository: string; workflowId: string; ref: string }
  | { status: "not-configured"; reason: string };

const customIdMaxLength = 1024;
const customIdHelp = "Use a relative key like media/casa-roca-hero. Do not use URLs, dot-prefixed folders, .., or repeated slashes.";

export function normalizeCloudflareImagesCustomId(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => segment.trim().replace(/\s+/g, "-"))
    .filter(Boolean)
    .join("/");
}

export function validateCloudflareImagesCustomId(value: string): CloudflareImagesCustomIdValidation {
  const rawValue = value.trim();
  const normalizedValue = normalizeCloudflareImagesCustomId(value);

  if (!rawValue || !normalizedValue) {
    return {
      isValid: false,
      message: customIdHelp,
      value: normalizedValue,
    };
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return {
      isValid: false,
      message: customIdHelp,
      value: normalizedValue,
    };
  }

  if (normalizedValue.length > customIdMaxLength) {
    return {
      isValid: false,
      message: "Cloudflare Images custom IDs must be 1024 characters or less.",
      value: normalizedValue,
    };
  }

  const invalidSegment = normalizedValue
    .split("/")
    .find((segment) => segment.startsWith(".") || segment === "..");

  if (invalidSegment) {
    return {
      isValid: false,
      message: customIdHelp,
      value: normalizedValue,
    };
  }

  return {
    isValid: true,
    value: normalizedValue,
  };
}

export async function createCloudflareImagesDirectUpload(
  payload: DashboardMediaUploadPayload,
  config: CloudflareImagesDirectUploadConfig,
  providerFetch: typeof fetch = fetch,
): Promise<CloudflareImagesDirectUploadResult> {
  const accountId = config.accountId?.trim();
  const apiToken = config.apiToken?.trim();
  const accountHash = config.accountHash?.trim();

  if (!accountId || !apiToken || !accountHash) {
    throw new Error("Cloudflare Images upload is not configured.");
  }

  const customId = validateCloudflareImagesCustomId(payload.storageKey);

  if (!customId.isValid) {
    throw new Error(`Cloudflare Images custom ID is invalid. ${customId.message}`);
  }

  const form = new FormData();
  form.set("id", customId.value);
  form.set("requireSignedURLs", "false");
  form.set("metadata", JSON.stringify({
    altText: payload.altText,
    contentId: payload.contentId,
    locale: payload.locale,
    usage: payload.usage,
  }));

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
  const body = await response.json() as {
    success?: boolean;
    result?: {
      id?: string;
      uploadURL?: string;
    };
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok || !body.success || !body.result?.id || !body.result.uploadURL) {
    const providerMessage = body.errors?.map((error) => error.message).filter(Boolean).join(" ");
    throw new Error(providerMessage || "Cloudflare Images upload URL could not be created.");
  }

  return {
    imageId: body.result.id,
    publicUrl: `https://imagedelivery.net/${accountHash}/${body.result.id}/public`,
    uploadURL: body.result.uploadURL,
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
          target_environment: config.environment === "production" ? "production" : "preview",
        },
      }),
    },
  );

  if (response.status !== 204) {
    let message = "GitHub publish workflow could not be queued.";

    try {
      const body = await response.json() as { message?: string };
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
