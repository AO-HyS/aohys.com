#!/usr/bin/env python3
"""Audit or prepare one Git repository for the canonical Development System."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from typing import Any


MANAGED_FILES = (
    ".development-system/repository.json",
    ".codex/development-system/repository.md",
)
RETIRED_MANAGED_FILES = (".factory/development-system/repository.md",)


class BootstrapError(RuntimeError):
    pass


def run(command: list[str], *, cwd: Path | None = None, allow_failure: bool = False) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0 and not allow_failure:
        detail = result.stderr.strip() or result.stdout.strip() or f"exit {result.returncode}"
        raise BootstrapError(f"Command failed: {' '.join(command)}\n{detail}")
    return result


def git_root(repository: Path) -> Path:
    if not repository.is_dir():
        raise BootstrapError(f"Repository directory does not exist: {repository}")
    result = run(["git", "-C", str(repository), "rev-parse", "--show-toplevel"], allow_failure=True)
    if result.returncode != 0:
        raise BootstrapError(f"Target is not a Git repository: {repository}")
    return Path(result.stdout.strip()).resolve()


def git_status_paths(repository: Path) -> set[str]:
    result = run(
        ["git", "-C", str(repository), "status", "--porcelain=v1", "--untracked-files=all"],
    )
    paths: set[str] = set()
    for line in result.stdout.splitlines():
        if len(line) < 4:
            continue
        path = line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        if path.startswith('"') and path.endswith('"'):
            try:
                path = json.loads(path)
            except json.JSONDecodeError:
                pass
        paths.add(path)
    return paths


def snapshot_paths(repository: Path, paths: set[str]) -> dict[str, str]:
    snapshots: dict[str, str] = {}
    for relative in sorted(paths):
        path = repository / relative
        if path.is_symlink():
            snapshots[relative] = "symlink:" + os.readlink(path)
            continue
        if not path.is_file():
            snapshots[relative] = "missing"
            continue
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        snapshots[relative] = "sha256:" + digest.hexdigest()
    return snapshots


def resolve_cli(explicit: str | None) -> tuple[list[str], Path]:
    candidates: list[Path] = []
    if explicit:
        candidates.append(Path(explicit).expanduser())
    configured = os.environ.get("AOHYS_DEVELOPMENT_SYSTEM_CLI")
    if configured:
        candidates.append(Path(configured).expanduser())
    installed = shutil.which("aohys-development-system")
    if installed:
        candidates.append(Path(installed))
    candidates.append(
        Path.home()
        / "Documents/AO/.worktrees/development-system-current/bin/development-system"
    )
    candidates.append(Path.home() / "Documents/AO/development-system/bin/development-system")

    checked: list[str] = []
    for candidate in candidates:
        candidate = candidate.resolve()
        if candidate.is_dir():
            candidate = candidate / "bin/development-system"
        checked.append(str(candidate))
        if not candidate.is_file():
            continue
        if candidate.suffix == ".mjs":
            node = shutil.which("node")
            if not node:
                raise BootstrapError("Node.js is required to run the Development System CLI")
            return [node, str(candidate)], candidate
        if os.access(candidate, os.X_OK):
            return [str(candidate)], candidate
    raise BootstrapError(
        "Canonical Development System CLI was not found. Checked: " + ", ".join(checked)
    )


def parse_json_result(result: subprocess.CompletedProcess[str], label: str) -> dict[str, Any]:
    try:
        value = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        detail = result.stderr.strip() or result.stdout.strip()
        raise BootstrapError(f"{label} did not return JSON: {detail}") from error
    if not isinstance(value, dict):
        raise BootstrapError(f"{label} returned an unexpected JSON value")
    return value


def call_cli(
    cli: list[str],
    operation: str,
    *,
    repository: Path | None = None,
    confirm: str | None = None,
    allow_failure: bool = False,
) -> tuple[dict[str, Any], int]:
    command = [*cli, operation]
    if repository is not None:
        command.extend(["--repository", str(repository)])
    if confirm is not None:
        command.extend(["--confirm", confirm])
    command.append("--json")
    result = run(command, allow_failure=allow_failure)
    return parse_json_result(result, operation), result.returncode


def accepted_transition(
    cli: list[str], operation: str, repository: Path, confirmation: str
) -> dict[str, Any]:
    transition, exit_code = call_cli(
        cli,
        operation,
        repository=repository,
        confirm=confirmation,
        allow_failure=True,
    )
    if transition.get("operation") != operation or transition.get("status") not in {
        "updated",
        "unchanged",
    }:
        raise BootstrapError(
            f"{operation} failed with exit {exit_code}: {json.dumps(transition, sort_keys=True)}"
        )
    return transition


def read_contract_version(repository: Path) -> str | None:
    path = repository / MANAGED_FILES[0]
    if not path.is_file():
        return None
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    version = value.get("contractVersion") if isinstance(value, dict) else None
    return version if isinstance(version, str) else None


def cli_source(cli_path: Path) -> dict[str, Any]:
    root = cli_path.parent.parent if cli_path.parent.name == "bin" else cli_path.parent
    commit = run(
        ["git", "-C", str(root), "rev-parse", "HEAD"], allow_failure=True
    )
    return {
        "path": str(cli_path),
        "root": str(root),
        "commit": commit.stdout.strip() if commit.returncode == 0 else None,
    }


def harness_ready(audit: dict[str, Any]) -> bool:
    readiness = audit.get("readiness")
    if not isinstance(readiness, dict) or not readiness:
        return False
    return all(
        isinstance(value, dict) and value.get("status") == "prepared"
        for value in readiness.values()
    )


def installation_summary(installation: dict[str, Any]) -> dict[str, Any]:
    return {
        key: installation.get(key)
        for key in ("ok", "operation", "status", "contractVersion", "source", "problems")
        if key in installation
    }


def human_summary(report: dict[str, Any]) -> str:
    lines = [
        f"Repository: {report['repository']}",
        f"Mode: {report['mode']}",
        f"Status: {report['after'].get('status', 'unknown')}",
        f"Structurally ready: {'yes' if report['structurallyReady'] else 'no'}",
    ]
    transition = report.get("transition")
    if isinstance(transition, dict):
        lines.append(
            f"Transition: {transition.get('operation')} ({transition.get('status', 'unknown')})"
        )
    readiness = report["after"].get("readiness", {})
    if isinstance(readiness, dict):
        for harness, state in readiness.items():
            if not isinstance(state, dict):
                continue
            gaps = state.get("gaps") or []
            suffix = f"; gaps: {', '.join(gaps)}" if gaps else ""
            lines.append(f"{harness}: {state.get('status', 'unknown')}{suffix}")
    if report["warnings"]:
        lines.extend(f"Warning: {warning}" for warning in report["warnings"])
    return "\n".join(lines)


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Audit or prepare a Git repository for the canonical agent Development System."
    )
    result.add_argument("--repository", required=True, help="Path inside the target Git repository")
    result.add_argument(
        "--development-system",
        help="Path to the canonical Development System checkout or CLI",
    )
    result.add_argument(
        "--apply",
        action="store_true",
        help="Initialize an unmanaged repo or normalize an existing managed repo",
    )
    result.add_argument(
        "--require-prepared",
        action="store_true",
        help="Exit non-zero when any harness still reports needs-preparation",
    )
    result.add_argument("--json", action="store_true", help="Emit the complete JSON report")
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        repository = git_root(Path(args.repository).expanduser().resolve())
        cli, cli_path = resolve_cli(args.development_system)
        before_dirty = git_status_paths(repository)
        managed_namespace = set(MANAGED_FILES) | set(RETIRED_MANAGED_FILES)
        protected_before = snapshot_paths(repository, before_dirty - managed_namespace)

        global_installation, global_exit = call_cli(cli, "validate", allow_failure=True)
        before, _ = call_cli(cli, "audit-repository", repository=repository)

        transition: dict[str, Any] | None = None
        if args.apply:
            managed_contract = repository / MANAGED_FILES[0]
            if not managed_contract.exists():
                transition = accepted_transition(
                    cli,
                    "initialize-repository",
                    repository,
                    "initialize",
                )
            else:
                transition = accepted_transition(
                    cli,
                    "normalize-repository",
                    repository,
                    "normalize",
                )

        after, _ = call_cli(cli, "audit-repository", repository=repository)
        after_dirty = git_status_paths(repository)
        new_changed_paths = sorted(after_dirty - before_dirty)
        protected_after = snapshot_paths(repository, before_dirty - managed_namespace)
        preexisting_changed = sorted(
            path for path, digest in protected_before.items() if protected_after.get(path) != digest
        )
        unexpected = sorted((set(new_changed_paths) - managed_namespace) | set(preexisting_changed))
        transition_side_effects = (
            transition.get("externalSideEffects", []) if isinstance(transition, dict) else []
        )
        managed_side_effects = [
            item
            for item in transition_side_effects
            if isinstance(item, dict)
            and (
                (item.get("type") == "managed-write" and item.get("path") in MANAGED_FILES)
                or (
                    item.get("type") == "managed-remove"
                    and item.get("path") in RETIRED_MANAGED_FILES
                )
            )
        ]
        unexpected_side_effects = [
            item for item in transition_side_effects if item not in managed_side_effects
        ]
        contract_version = read_contract_version(repository)
        global_version = global_installation.get("contractVersion")
        warnings: list[str] = []
        if global_exit != 0 or global_installation.get("status") != "healthy":
            warnings.append("The global Development System installation is not healthy.")
        if contract_version and global_version and contract_version != global_version:
            warnings.append(
                f"Repository contract {contract_version} differs from global installation {global_version}."
            )
        if unexpected:
            warnings.append("Unexpected paths changed during bootstrap; inspect before continuing.")
        if unexpected_side_effects:
            warnings.append("Unexpected external side effects were reported; inspect before continuing.")

        report: dict[str, Any] = {
            "ok": not unexpected and not unexpected_side_effects,
            "operation": "bootstrap-development-system",
            "mode": "apply" if args.apply else "audit",
            "repository": str(repository),
            "developmentSystem": {
                **cli_source(cli_path),
                "globalInstallation": installation_summary(global_installation),
            },
            "before": before,
            "transition": transition,
            "after": after,
            "contractVersion": contract_version,
            "structurallyReady": harness_ready(after),
            "managedFiles": list(MANAGED_FILES),
            "retiredManagedFiles": list(RETIRED_MANAGED_FILES),
            "preExistingDirtyPaths": sorted(before_dirty),
            "preExistingChangedPaths": preexisting_changed,
            "newChangedPaths": new_changed_paths,
            "unexpectedChangedPaths": unexpected,
            "warnings": warnings,
            "managedSideEffects": managed_side_effects,
            "externalSideEffects": unexpected_side_effects,
        }
        output = json.dumps(report, indent=2, sort_keys=True) if args.json else human_summary(report)
        print(output)
        if unexpected or unexpected_side_effects:
            return 4
        if args.require_prepared and not report["structurallyReady"]:
            return 3
        return 0
    except BootstrapError as error:
        failure = {
            "ok": False,
            "operation": "bootstrap-development-system",
            "error": str(error),
            "externalSideEffects": [],
        }
        print(json.dumps(failure, indent=2) if args.json else f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
