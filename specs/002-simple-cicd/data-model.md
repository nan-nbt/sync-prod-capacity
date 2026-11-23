# Data Model: Pipeline and Image Publication

This feature defines operational pipeline records, not new application database tables. The existing production-capacity transfer schema and CLI remain unchanged.

## Pipeline run

| Field | Meaning / validation |
|---|---|
| Source | Push event only; reject all other pipeline sources. |
| Ref | Must equal the configured default branch. |
| Commit SHA | Commit being built, analyzed and used to identify the published image. |
| Stages | `build` (build/test) → `code-review` (quality analysis/gate) → `docker-image` (build/push); a stage starts only after prerequisite success. |
| Outcome | Success only when image push succeeds; failures are visible in GitLab stage/job results. |

**Transitions**: eligible push → build running → failed or build succeeded → analysis running → failed, gate pending, gate failed, gate timed out, or gate passed → image running → failed or published. Any failure before gate pass prevents image creation. Pending gate waits at most five minutes and fails closed. No deployment state exists.

## Build artifact

| Field | Meaning / validation |
|---|---|
| Source commit | Same commit as the pipeline run. |
| Executable JAR | Output of successful `bootJar`; the image uses this exact artifact, transferred between jobs as an artifact, not rebuilt from source or substituted from cache. |
| Compiled analysis inputs | Successful build outputs needed by the approved Java scanner; transferred as artifacts as required by that scanner. |
| Test outcome | CI `gradle test` using the approved Gradle 8.14.4 build image succeeds before analysis; local wrapper remains 8.14.3. |
| Retention and cache | Successful build artifacts expire after one day; verify retries and access. The Gradle dependency cache is scoped by project/tool version and trust boundary and never supplies the executable JAR. |
| Security | Excludes `.env`, credentials and unrelated secrets. |

## Quality gate result

| Field | Meaning / validation |
|---|---|
| Analysis reference | Analysis of the pipeline commit, submitted to the PCG-managed SonarQube project. |
| State | Pending, passed, failed, unavailable or timed out. Only passed permits image creation. |
| Wait limit | Five minutes; a result not received within that time is failure. |

The owner selected the specified SonarScanner CLI image and confirmed managed project, endpoint, gate and protected token configuration. Verify actual scanner compatibility and access during implementation.

## Published image

| Field | Meaning / validation |
|---|---|
| Destination | Owner-selected project GitLab Container Registry; owner confirms access, which must be verified in the pipeline. |
| Tag | Commit SHA; no mutable `latest` tag is required. Commit-specific tag avoids conflicts between distinct commits but is not a registry immutability guarantee. |
| Contents | The exact executable JAR from the build artifact and required runtime only; no `.env` or other secrets. |
| Publication | Successful image build and successful registry push are both required. |

## Configuration and credentials

Pipeline source, default ref, commit and registry coordinates come from the GitLab environment. Use `SONAR_HOST_URL`, `SONAR_PROJECT_KEY` and protected `SONAR_TOKEN`; the owner confirmed managed settings exist, and their actual behavior must be verified without recording secret values. Verify protected branch and runner configuration before relying on protected variables. The application still needs an explicit valid `--days` argument and external lab-only configuration for any separately authorized manual execution; CI does not start it.
