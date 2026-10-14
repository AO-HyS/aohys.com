export type SaveBarState = "clean" | "dirty" | "saving" | "saved" | "error";

export type SaveResult = "clean" | "saved" | "error";

// One derivation for every editor: a failed save stays visible until the next
// edit or save, then local changes read as dirty.
export function saveBarState({
  isSaving,
  hasChanges,
  result,
}: {
  isSaving: boolean;
  hasChanges: boolean;
  result: SaveResult;
}): SaveBarState {
  if (isSaving) return "saving";
  if (result === "error") return "error";
  return hasChanges ? "dirty" : result;
}
