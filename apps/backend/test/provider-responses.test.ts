import { describe, expect, it } from "vitest";
import {
  parseCloudflareImagesUploadResponse,
  parseGitHubErrorResponse,
  parseResendNotificationResponse,
} from "../src/provider-responses.js";

describe("provider response boundaries", () => {
  it("accepts the owned provider fields", () => {
    expect(parseResendNotificationResponse({ id: "email-1" })).toEqual({
      notificationId: "email-1",
    });
    expect(
      parseCloudflareImagesUploadResponse({
        success: true,
        result: { id: "image-1", uploadURL: "https://upload.example.com" },
        errors: [],
      }),
    ).toMatchObject({ success: true, imageId: "image-1" });
    expect(parseGitHubErrorResponse({ message: "Bad request" })).toEqual({
      message: "Bad request",
    });
  });

  it("rejects malformed success payloads", () => {
    expect(() => parseResendNotificationResponse({ id: 42 })).toThrow(
      "notification id",
    );
    expect(() =>
      parseCloudflareImagesUploadResponse({ success: "yes" }),
    ).toThrow("invalid response");
  });
});
