# Implementation Plan: Simple CI/CD Pipeline

**Branch**: `feat/002-simple-cicd` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

**Status**: Updated for the strict infrastructure request and owner-approved publication controls. `IMAGE_PUBLISH_ENABLED` is a temporary protected project variable: unset/false runs image build without login or push during preflight; only after reviewed evidence is it set to `true`, enabling automatic publication on successful default-branch pipelines. It adds no fourth stage or permanent per-pipeline manual approval. Runner isolation, per-job credentials, and runtime behavior still require actual verification; no end-to-end verification is claimed.

## Summary

Replace the GitLab Pages pipeline with a pipeline triggered only by pushes to the default branch. Run automated tests and build a Boot JAR; run SonarQube analysis and wait at most five minutes for a passing quality gate; then build and push a commit-SHA-tagged Docker image to this project's GitLab container registry. Never deploy or run the transfer. This is a post-merge gate and does not enforce merge approvals.

## Current Strict Infrastructure Specification

The following is the current request, preserved verbatim. It supersedes earlier conflicting image and stage-name choices; operational claims remain subject to verification.

### Strict Architectural & Infrastructure Specifications
1. **GitLab Runner Tag:** All jobs MUST strictly run using the tag: `SGP-Test-K8s`
2. **Pipeline Stages (Strict Order):**
   - **Stage 1: `build`** (Build bootJar)
     - **Image:** `repo.pouchen.com/docker-proxy-group/library/gradle:8.14.4-jdk21-alpine`
     - **Action:** Execute `./gradlew clean bootJar` (or `gradle bootJar`) and pass the generated `.jar` artifact (`build/libs/*.jar`) to subsequent stages.
   - **Stage 2: `code-review`** (Static Analysis via SonarQube)
     - **Image:** `repo.pouchen.com/docker-pcc-group/sonarsource/sonar-scanner-cli:11.4.0.2044_7.2.0`
     - **Action:** Run `sonar-scanner` using pre-configured GitLab CI/CD variables (`$SONAR_HOST_URL`, `$SONAR_TOKEN`, `$SONAR_PROJECT_KEY`) with `-Dsonar.qualitygate.wait=true` so the pipeline fails deterministically if the Quality Gate fails.
   - **Stage 3: `docker-image`** (Build & Push to GitLab Container Registry)
     - **Image & Service:** `repo.pouchen.com/docker-proxy-group/library/docker:27.3.1-dind-alpine3.20` (configure Docker-in-Docker appropriately for Kubernetes runner `SGP-Test-K8s`, e.g., `DOCKER_HOST` / TLS settings).
     - **Action:** Build the application Docker image using the artifact from Stage 1, authenticate using GitLab's built-in registry credentials (`$CI_REGISTRY_USER`, `$CI_REGISTRY_PASSWORD`, `$CI_REGISTRY`), and push the image to the GitLab Project Registry (`$CI_REGISTRY_IMAGE`).

### Scope Constraints
- Keep the implementation strictly focused on these 3 stages for a training/exam project.
- Do NOT include deployment stages (Kubernetes manifests, Helm, ArgoCD, etc.).
- Ensure the `Dockerfile` uses an approved internal Java 21 JRE image from `repo.pouchen.com` (specify placeholder/verify tag if needed).
- Include explicit job timeouts (e.g., `timeout: 10m`) and caching/artifact rules to ensure clean, repeatable execution.

## Existing Design Confirmation

| Source | Applicability / decision | Owner disposition / evidence |
|---|---|---|
| [spec.md](spec.md), FR-001–FR-009 | Replace Pages, retain default-branch-only trigger, three ordered stages and no deployment. | Approved 2026-11-19; Pages publication stops. |
| `.specify/memory/constitution.md`, CONST-SCOPE-1 | CI and image publication extend the narrow transfer scope without changing transfer behavior. | Owner approved scope exception. |
| `specs/001-sync-production-capacity/spec.md`, FR-002–FR-005 | Existing `--days` requests positive calendar days including the run date, UTC+08:00; CI never executes a transfer. | Retained unchanged. |
| `build.gradle`, `gradle/wrapper/gradle-wrapper.properties` | Java 21, Spring Boot 3.5.7, local wrapper 8.14.3. CI uses the supplied Java 21/Gradle 8.14.4 image and installed `gradle`; wrapper stays unchanged. | Owner approved tests, Boot JAR and the CI/local Gradle patch-version difference. |
| `docs/tech-stack.md` items 6 and 11; `docs/rules/spring-boot.md`, Gradle Configuration | Single-architecture image, protected CI secrets instead of assuming Vault, and no `.env` version triplet; use internal Maven proxy for dependencies and plugins. | Owner confirmed authorization and required project-specific exceptions. No global standards changes implied. |
| G2 Solution › Pou Chen Spring Boot Project Development Guidelines | Guidance names `repo.pouchen.com/docker-pcc-local` and a pre-merge gate. | Owner confirmed required organizational approval for GitLab registry and post-merge-only gate exceptions. |
| G2 Solution › GitLab Runner List | `SGP-Test-K8s` is a build runner; documented public runners have no external network access. | Owner selected runner and confirmed Docker-in-Docker support and required connectivity. Verify in actual jobs. |

## Technical Context

- **Language/Version**: Java 21; Spring Boot 3.5.7. Local wrapper Gradle 8.14.3; CI installed Gradle 8.14.4 from `repo.pouchen.com/docker-proxy-group/library/gradle:8.14.4-jdk21-alpine`.
- **Dependencies**: GitLab CI; SonarScanner CLI image `repo.pouchen.com/docker-pcc-group/sonarsource/sonar-scanner-cli:11.4.0.2044_7.2.0`; image job and Docker-in-Docker service both use `repo.pouchen.com/docker-proxy-group/library/docker:27.3.1-dind-alpine3.20`; Java 21 JRE runtime image from the PCG Docker proxy.
- **Storage**: GitLab job artifacts for JAR, Java bytecode and required analysis dependencies; project GitLab container registry for images. No CI database access.
- **Testing**: `gradle test bootJar` in the CI build image; local wrapper `./gradlew test` and `./gradlew bootJar`. Controlled pipeline tests on the owner-authorized isolated training project `https://pcggit.pouchen.com/pci-dev-ai/training/speckit-etl-anan` and its registry.
- **Target Platform**: `SGP-Test-K8s`, Linux/amd64. Verify image availability, runner service/privileges and TLS configuration before enabling publication.
- **Project Type**: Existing single-project CLI batch utility and internal CI pipeline.
- **Performance Goals**: Quality gate wait bounded by 300 seconds; no other performance target specified.
- **Constraints**: Default-branch push events only; test/build, analysis or gate failure blocks image creation; no deploy, lab transfer or secrets in artifacts, images, context or logs.
- **Scale/Scope**: One project and SHA tag per commit; no moving tag or multi-architecture requirement.

## Constitution Check

| Principle | Pre-research gate | Post-design gate |
|---|---|---|
| CONST-SCOPE-1 | Pass: owner approved CI/image publication exception. | Pass: no application behavior change or deployment. |
| CONST-REQ-1 | Pass: owner approved technology-neutral requirements; original input retained as provenance. | Pass: decisions and verification obligations are separated from requirements. |
| CONST-TRANSFER-1 | Not applicable to pipeline execution; existing transfer contract retained. | Existing required `--days` value selects that many calendar days including the run date, UTC+08:00; CI does not run it. |
| CONST-SIMPLE-1 | Pass subject to design review. | Pass for this three-stage design: existing Gradle project, scanner and single Docker build; no added application components. |
| CONST-REVIEW-1 | Pass for owner-reviewed planning direction. | Pass: strict image/stage choices and proposed timeout/cache/retention are owner-approved; implementation completion requires passing tests and acceptance evidence. |

## Implementation Details

- **File paths**: Replace `.gitlab-ci.yml`; add root `Dockerfile` and `.dockerignore`. Update `build.gradle` and `settings.gradle` as needed to route dependency and plugin resolution through `https://repo.pouchen.com/repository/maven-proxy-group/`. Do not change the Gradle wrapper or application behavior.
- **Build**: Verify the supplied image has Java 21 and Gradle 8.14.4, then run `gradle --no-daemon clean test bootJar`; tests are required by the approved specification. Use installed Gradle, not `./gradlew`, inside CI. Resolve dependencies and plugins through the internal Maven proxy. The wrapper remains local Gradle 8.14.3.
- **Artifacts**: Publish `build/libs/*.jar` and the unambiguously selected executable JAR as the same successful build's artifacts, along with compiled production classes and scanner-required dependency JARs. Stage the executable JAR separately for the image to avoid accidentally selecting the plain JAR. Use explicit build-job artifact dependencies, `when: on_success`, and one-day expiry; verify retention permits retries and access is limited. Never use a cache as artifact provenance. Exclude `.env` and credentials from artifacts and Docker context.
- **Caching**: Cache Gradle dependency data under `GRADLE_USER_HOME` (for example `.gradle/caches/modules-2/`) with a project- and tool-version-scoped key; segregate protected and unprotected refs according to GitLab settings. Do not cache build outputs, staged artifacts, credentials or Sonar tokens. Cache misses and concurrent runner cache variation must not affect correctness; the `clean` build and artifacts remain authoritative. No scanner cache is required.
- **Analysis**: Use the specified SonarScanner CLI image and protected CI variables `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`; map existing managed configuration to them. Scan the same commit using the transferred compiled classes and libraries; set quality-gate waiting to true and timeout to 300 seconds. Fail closed on errors, failed gate, unavailable service or timeout. Verify whether the managed gate requires test analysis or coverage inputs; the current build produces no coverage report.
- **Image and registry**: Use `repo.pouchen.com/docker-proxy-group/library/docker:27.3.1-dind-alpine3.20` for both job image and service. Override the job image entrypoint as needed so GitLab can run its shell rather than a second daemon; explicitly alias the service `docker`. Verify the job image contains the CLI and shell and supports the override. For TLS, set `DOCKER_HOST=tcp://docker:2376`, `DOCKER_TLS_CERTDIR=/certs`, `DOCKER_TLS_VERIFY=1` and `DOCKER_CERT_PATH=/certs/client`; the isolated privileged Kubernetes runner must provide per-job client certificates shared only with that job, and concurrent jobs must not read each other's certs. Verify TLS and CA trust before publication; do not fall back to insecure TCP. Use the previously owner-selected JRE `repo.pouchen.com/docker-proxy-group/azul/zulu-openjdk-alpine:21.0.13.1-21.54-jre`, subject to actual pull and architecture verification, and copy only the exact built JAR. When enabled, login via standard input with GitLab's predefined registry credentials and push `$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA`. SHA naming does not make tags immutable.
- **Rules and ordering**: Pipeline-level rules permit only source `push` and ref equal to default branch; all other sources/refs are excluded. Stage names are exactly `build` → `code-review` → `docker-image`; only successful earlier stages permit later ones, including when using explicit `needs`. Every job uses `SGP-Test-K8s`, has `timeout: 10m`, and fails normally rather than allowing failure. Ensure the scanner's five-minute gate wait fits within its job timeout; a job timeout also fails closed. Project settings independently govern merge approval and branch protection.
- **Security / ACL**: Owner confirms registry writable, branch protected, appropriate runner and protected/masked credentials configured, and DinD support. Use the protected project variable `IMAGE_PUBLISH_ENABLED` as a temporary publication control: unset/false keeps the docker-image stage in the successful pipeline but skips registry login/push; after preflight results are reviewed, setting it to `true` enables automatic publication on successful default-branch pipelines, with no fourth stage or per-run manual approval. Only this control blocks the explicit push command; it does not establish credential isolation. Verify that build and analysis cannot write via automatic `CI_JOB_TOKEN`/registry credentials and that Sonar credentials are exposed only to the analysis job. Protected/masked variables alone do not enforce job isolation. Verify privileged-runner isolation and per-job DinD TLS certificate storage against concurrent jobs; if isolation cannot be enforced, stop and request an approved design rather than weakening security.
- **Error format / observability**: Native job/stage statuses and safe logs distinguish failures; no credential or record-value logging.
- **Batch behavior**: N/A; no transfer performed or changed.
- **Deployment**: None. The image packages the CLI. A separately authorized manual run still requires valid `--days` and external lab-only `.env` configuration; no secrets are embedded.
- **Rollback**: Revert pipeline changes through a reviewed commit. Do not delete registry images without separate approval. Restoring Pages or deploying requires a separate decision.

**Owner Review Gate**: The owner has approved scope, trigger, ordering, tests, registry, SHA tag, five-minute gate, post-merge limitation, DinD with TLS, Gradle difference, Java 21 JRE, project-specific exceptions, controlled testing, ten-minute job timeouts, one-day artifact retention, dependency-only cache, temporary preflight publication control and subsequent enablement after reviewed evidence. Owner approval does not constitute actual CI-job verification; validate runner, images, job-token boundaries, per-job TLS isolation and acceptance outcomes before setting `IMAGE_PUBLISH_ENABLED=true`. No secret values are recorded.

## Deviation Log

| Original approved design | Current planned choice | Reason / approval |
|---|---|---|
| Earlier owner-approved working-tree choice: `repo.pouchen.com/docker-proxy-group/library/docker:27.5.1-cli` as job image with `repo.pouchen.com/docker-proxy-group/library/docker:27.3.1-dind-alpine3.20` service. | Current request requires `repo.pouchen.com/docker-proxy-group/library/docker:27.3.1-dind-alpine3.20` for both job image and service. | Current strict instruction supersedes the earlier choice. Verify CLI/shell availability, entrypoint override, per-job TLS and actual runner behavior; stop if unsupported. |
| Select an available PCG-proxied Java 21 JRE image. | Use `repo.pouchen.com/docker-proxy-group/azul/zulu-openjdk-alpine:21.0.13.1-21.54-jre`. | Owner selected and reported verification of this exact runtime reference on 2026-11-20; actual pull and architecture verification remain pending. |
| Select a working authenticated Docker-in-Docker setup for Kubernetes runner `SGP-Test-K8s`. | Use TLS with `DOCKER_HOST=tcp://docker:2376`, `DOCKER_TLS_CERTDIR=/certs`, `DOCKER_TLS_VERIFY=1` and `DOCKER_CERT_PATH=/certs/client`; require the privileged runner to provide a per-job client-certificate volume shared only by the job and its DinD service. | Reverted the temporary plaintext TCP experiment after the daemon was unreachable at port 2375. Require the runner administrator to configure the shared per-job certificate volume and verify privileged DinD support. Keep `IMAGE_PUBLISH_ENABLED` unset/false until TLS connectivity and isolation are verified. No TLS bypass is permitted. |

## Contract Coverage

No public API or independently exposed interface is added; internal pipeline state and registry publication behavior are in [data-model.md](data-model.md), mapped to FR-001–FR-009. The existing CLI contract is unchanged. No `contracts/` directory is required.

## Project Structure

```text
.gitlab-ci.yml                         # replace existing Pages pipeline
Dockerfile                             # planned single-JAR Java 21 runtime image
.dockerignore                          # planned context and secret exclusions
build.gradle                           # internal dependency resolution as needed
settings.gradle                        # internal plugin resolution as needed
gradle/wrapper/                        # unchanged local wrapper
src/main/                              # existing application unchanged
src/test/                              # existing tests
specs/002-simple-cicd/                 # spec, checklist, plan and design artifacts
```

**Structure Decision**: Keep the existing single-project layout. The ordered implementation tasks are in `tasks.md`.

## Needs Clarification

No unresolved requirement decisions for planning. Operational feasibility remains unverified: perform the checks below and keep publication disabled until they pass.

## Implementation and Acceptance Prerequisites

1. Owner approved `timeout: 10m` per job, project/tool/ref-protected Gradle dependency cache, and one-day artifact expiry; verify effective retention settings and cold/warm cache behavior. Confirm supplied Gradle image is reachable and has Gradle 8.14.4 and Java 21. Verify internal Maven proxy resolves existing dependencies and plugin markers without public access.
2. Confirm the Sonar scanner image, selected Java 21 JRE and specified Docker DinD job/service image are available through PCG registry; verify the DinD image's CLI, shell and overridden job entrypoint, and scanner compatibility with managed server, Java bytecode and `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`. Verify whether the managed gate requires coverage or test inputs not currently produced. Do not disclose values.
3. Verify DinD service starts on `SGP-Test-K8s`, supports required privileges, per-job TLS certificate isolation under concurrent jobs, and registry connectivity; verify protected branch and credentials are effective. If any assumption fails, stop and obtain an owner-approved alternative.
4. Confirm this training project and registry remain isolated and that controlled failure tests on its default branch are authorized before test execution. Keep protected project variable `IMAGE_PUBLISH_ENABLED` unset/false during preflight so image jobs build without logging in or pushing; after credential, TLS and failure-gate evidence passes owner review, set it to `true` to enable automatic publication on eligible successful pipelines. This introduces no permanent approval gate or extra stage. Establish and verify a project-scoped method to induce failed, pending and timed-out gates without changing shared Sonar settings; if unavailable, stop and report those tests as unverified. Do not run the transfer, access lab DB, delete registry data, or alter shared quality gates. Use test-scoped fault injection and revert test changes through reviewed commits.
5. Exercise all success, exclusion, gate wait/timeout, analysis, build, image build and push failure cases in [quickstart.md](quickstart.md), retaining safe evidence. Tests are not yet run.

## Authoritative Source Writeback List

| Target | Change summary | Status |
|---|---|---|
| None | Owner-approved deviations are specific to this feature; no global technology-guidance writeback was authorized. | N/A |

## Complexity Tracking

No added application component is required. CI/image publication is an explicitly owner-approved scope exception; it does not alter transfer behavior.
