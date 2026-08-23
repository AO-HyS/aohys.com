type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseResendNotificationResponse(value: unknown): {
  notificationId?: string;
} {
  if (!isRecord(value)) {
    throw new Error("Resend returned an invalid response payload.");
  }
  if (value.id !== undefined && typeof value.id !== "string") {
    throw new Error("Resend returned an invalid notification id.");
  }
  return typeof value.id === "string" ? { notificationId: value.id } : {};
}

export interface CloudflareImagesUploadResponse {
  success: boolean;
  imageId?: string;
  uploadURL?: string;
  errors: string[];
}

export function parseCloudflareImagesUploadResponse(
  value: unknown,
): CloudflareImagesUploadResponse {
  if (!isRecord(value) || typeof value.success !== "boolean") {
    throw new Error("Cloudflare Images returned an invalid response payload.");
  }
  const result = isRecord(value.result) ? value.result : undefined;
  const errors = Array.isArray(value.errors)
    ? value.errors.flatMap((error) =>
        isRecord(error) && typeof error.message === "string"
          ? [error.message]
          : [],
      )
    : [];
  return {
    success: value.success,
    ...(typeof result?.id === "string" ? { imageId: result.id } : {}),
    ...(typeof result?.uploadURL === "string"
      ? { uploadURL: result.uploadURL }
      : {}),
    errors,
  };
}

export function parseGitHubErrorResponse(value: unknown): { message?: string } {
  if (!isRecord(value)) return {};
  return typeof value.message === "string" ? { message: value.message } : {};
}
