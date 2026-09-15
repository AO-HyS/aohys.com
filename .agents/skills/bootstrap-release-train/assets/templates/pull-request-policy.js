const pullRequest = context.payload.pull_request;

if (pullRequest.base.ref !== "__PRODUCTION_BRANCH__") {
  core.notice(
    "Local Husky gates are the source of truth; CI only validates the release path.",
  );
  return;
}

if (
  pullRequest.head.ref !== "__PREVIEW_BRANCH__" ||
  pullRequest.head.repo.full_name !== pullRequest.base.repo.full_name
) {
  core.setFailed(
    "Pull requests into __PRODUCTION_BRANCH__ must come from __PREVIEW_BRANCH__ in this repository.",
  );
  return;
}

core.notice(
  "Git owns commit ancestry; preview and production retain their own deployment evidence.",
);
