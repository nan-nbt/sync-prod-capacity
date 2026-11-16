---
description: "Check all feature branches and spec folders against the configured naming convention, then enforce compliance based on the enforcement.mode setting"
---

# Validate Branch Convention

Check all existing feature branches and spec folders against the configured naming convention. Depending on `enforcement.mode` in `.specify/branch-convention.yml`, either report violations, prompt the user to fix them, or automatically rename them.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The user may specify a specific branch to validate (e.g., "003-user-auth") or "all" to check everything.

## Prerequisites

1. Verify a spec-kit project exists by checking for `.specify/` directory
2. Load convention config from `.specify/branch-convention.yml`
3. If no convention is configured, use the default pattern (`{seq}-{kebab}` for both branch and folder)

## Outline

1. **Load convention and enforcement settings**: Read `.specify/branch-convention.yml` and extract:
   - `convention.branch_pattern` — the expected branch naming pattern
   - `convention.folder_pattern` — the expected spec folder naming pattern
   - Token definitions (seq_padding, separator, lowercase, etc.)
   - `enforcement.mode` — one of `enforce`, `prompt`, or `report` (default: `report`)
   - `enforcement.suggest_branch_name` — whether to output the next compliant branch name hint

2. **Compute the next compliant branch name for `/speckit.specify`**:

   When this command is running as a `before_specify` hook, the text the user typed after `/speckit.specify` is the feature description. Use that exact description as input to the helper script:

   ```bash
   node .specify/extensions/branch-convention/scripts/suggest-feature-name.mjs --json --create-branch "<feature description>"
   ```

   If the user or request includes a branch type or ticket, pass it through:

   ```bash
   node .specify/extensions/branch-convention/scripts/suggest-feature-name.mjs --json --create-branch --type bugfix --ticket PROJ-123 "<feature description>"
   ```

   The helper output contains `GIT_BRANCH_NAME`, `SPECIFY_FEATURE_DIRECTORY`, and `BRANCH_CREATED`. Print these values in a clearly marked block:

   ```markdown
   ## Branch Convention Suggestion
   GIT_BRANCH_NAME=<computed branch name>
   SPECIFY_FEATURE_DIRECTORY=<computed spec folder>
   BRANCH_CREATED=<true|false>
   ```

   **CRITICAL for the next hook**: This command has already created or switched to the compliant branch when `--create-branch` succeeds. If `speckit.git.feature` is still executed later in the hook list, it MUST be treated as already satisfied and skipped. If it cannot be skipped, invoke it only with `GIT_BRANCH_NAME=<computed branch name>` and `--allow-existing-branch` so it does not generate a second `003-...` branch:

   ```bash
   node .specify/extensions/branch-convention/scripts/suggest-feature-name.mjs --json --create-branch --allow-existing-branch --short-name "<short-name>" "<feature description>"
   ```

   Do not allow the next hook to auto-generate `003-...` when `GIT_BRANCH_NAME` was computed here. This is how branch creation obeys `.specify/branch-convention.yml` without modifying the native git extension.

3. **Output active convention** (always): Print the active convention at the top so the AI agent can use it when creating the next branch:

   ```
   ## Active Convention
   Branch pattern : {branch_pattern}
   Folder pattern : {folder_pattern}
   Default type   : {default_type}
   Example        : {example using default_type + seq 001 + "feature-name"}
   ```

   > This block is intentionally shown before any validation so downstream steps
   > (e.g. `speckit.git.feature`) can read the required format and set
   > `GIT_BRANCH_NAME` to a compliant value.

4. **Collect branches and folders**: Gather all feature-related items:
   - **Git branches**: List all local branches matching spec-kit patterns (exclude `main`, `master`, `develop`)
   - **Spec folders**: List all directories under `specs/`
   - **Match pairs**: Associate each branch with its corresponding spec folder

5. **Validate each item**: For every branch and folder, check:

   | Check | Rule | Example Violation |
   |-------|------|-------------------|
   | Pattern match | Branch matches `branch_pattern` structure | `user-auth` missing sequence number |
   | Type prefix | If pattern includes `{type}`, prefix must be in `type_prefix` map | `feature/003-auth` instead of `feat/003-auth` |
   | Sequence format | `{seq}` must be zero-padded to `seq_padding` digits | `3-auth` instead of `003-auth` |
   | Length limit | Branch name must not exceed `max_length` characters | `003-very-long-branch-name-that-exceeds-limit...` |
   | Case rule | If `lowercase: true`, no uppercase characters (except ticket IDs) | `003-User-Auth` |
   | Separator | Words must use configured `separator` | `003_user_auth` when separator is `-` |
   | Branch-folder sync | Branch name and folder name must be derivable from same source | Branch `feat/003-auth` but folder `004-auth` |
   | Ticket format | If pattern includes `{ticket}`, must match `ticket_pattern` regex | `proj-142` when pattern requires `[A-Z]+-[0-9]+` |

6. **Output compliance report**:

   ```markdown
   # Branch Convention Compliance Report

   **Convention**: {preset name or "custom"}
   **Branch pattern**: {branch_pattern}
   **Folder pattern**: {folder_pattern}

   ## Results

   | Branch | Folder | Status | Issues |
   |--------|--------|--------|--------|
   | feat/003-user-auth | 003-user-auth | ✅ Compliant | — |
   | 004-chat-system | 004-chat-system | ⚠️ Non-compliant | Missing type prefix |
   | feat/5-api | 5-api | ⚠️ Non-compliant | Sequence not zero-padded |

   ## Summary
   - **Total**: {N} branches
   - **Compliant**: {X} ✅
   - **Non-compliant**: {Y} ⚠️
   - **Orphaned folders** (no branch): {Z}
   ```

7. **Enforce based on `enforcement.mode`**:

   - **`report`** (default / read-only): Print the compliance report and stop. Do not modify any files.

   - **`prompt`**: If violations exist, show a rename plan (same as `speckit.branch-convention.rename` step 3) and ask the user for explicit confirmation before proceeding. If the user confirms, execute the renames (steps 5–6 of `speckit.branch-convention.rename`). If the user declines, print a warning and continue.

   - **`enforce`**: If violations exist, automatically execute all renames without asking for confirmation. Follow the same rename logic as `speckit.branch-convention.rename` (steps 5–6): use `git mv` for folders, `git branch -m` for branches, update artifact references. Print a summary of what was renamed.

## Rules

- **Always show the "Active Convention" block first** — even before any validation, so downstream steps can adopt the correct format
- **Always compute and show `GIT_BRANCH_NAME` when validating before `/speckit.specify`** — downstream branch creation must use it exactly
- **Always show all items** — include compliant and non-compliant for full visibility
- **Be specific about violations** — explain exactly which rule was violated and what the correct name should be
- **`enforce` mode never prompts** — it renames automatically and reports what changed
- **Never rename main/master/develop** — only rename spec-kit feature branches
- **Handle missing config gracefully** — if no convention is configured, validate against the default pattern and note that no custom convention has been set; treat `enforcement.mode` as `report` when config is absent
