import { describe, expect, it } from "vitest";
import * as LeadsFeature from "./leads";
import * as OverviewFeature from "./overview";
import * as ProjectsFeature from "./projects";
import * as ResumeFeature from "./resume";
import * as SettingsFeature from "./settings";

describe("dashboard feature interfaces", () => {
  it.each([
    ["overview", OverviewFeature, "DashboardHome"],
    ["projects", ProjectsFeature, "ProjectsScreen"],
    ["leads", LeadsFeature, "LeadsScreen"],
    ["resume", ResumeFeature, "ResumeScreen"],
    ["settings", SettingsFeature, "SettingsScreen"],
  ])(
    "keeps %s behind one public screen export",
    (_name, feature, screenName) => {
      expect(Object.keys(feature)).toEqual([screenName]);
      expect(feature[screenName as keyof typeof feature]).toBeTypeOf(
        "function",
      );
    },
  );
});
