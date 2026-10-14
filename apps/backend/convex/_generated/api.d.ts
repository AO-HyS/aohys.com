/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as content from "../content.js";
import type * as contentActions from "../contentActions.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_functions from "../lib/functions.js";
import type * as lib_validators from "../lib/validators.js";
import type * as model_content_media from "../model/content/media.js";
import type * as model_content_overview from "../model/content/overview.js";
import type * as model_content_projects from "../model/content/projects.js";
import type * as model_content_publication from "../model/content/publication.js";
import type * as model_content_resume from "../model/content/resume.js";
import type * as model_content_settings from "../model/content/settings.js";
import type * as model_content_shared from "../model/content/shared.js";
import type * as model_publication from "../model/publication.js";
import type * as publication from "../publication.js";
import type * as publicationActions from "../publicationActions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  auth: typeof auth;
  content: typeof content;
  contentActions: typeof contentActions;
  http: typeof http;
  leads: typeof leads;
  "lib/audit": typeof lib_audit;
  "lib/functions": typeof lib_functions;
  "lib/validators": typeof lib_validators;
  "model/content/media": typeof model_content_media;
  "model/content/overview": typeof model_content_overview;
  "model/content/projects": typeof model_content_projects;
  "model/content/publication": typeof model_content_publication;
  "model/content/resume": typeof model_content_resume;
  "model/content/settings": typeof model_content_settings;
  "model/content/shared": typeof model_content_shared;
  "model/publication": typeof model_publication;
  publication: typeof publication;
  publicationActions: typeof publicationActions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
