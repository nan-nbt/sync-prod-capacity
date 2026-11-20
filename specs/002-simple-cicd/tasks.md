# Tasks: Simple CI/CD Pipeline

**Input**: `specs/002-simple-cicd/spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, and `checklists/requirements.md`

**Gate**: The design is owner-reviewed. Verify the prerequisites below before enabling the replacement pipeline. If an approved image, runner, TLS, credential isolation, or safe test method is unavailable, stop and request an owner-approved alternative; do not silently weaken or substitute the design. Do not record secret values.

**Scope**: Replace Pages with a default-branch push-only, three-stage build/analysis/image pipeline. No deployment, transfer execution, lab database access, wrapper change, or application behavior change. The existing automated tests run in the build; the plan explicitly requires controlled acceptance checks, not a new pipeline test framework. No public interface contract or database entity is added.

**Format**: `- [ ] Tnnn [P?] [USn?] action in path — DoD: result — Verify: method`. `[P]` means tasks touch different files and have no dependency on one another. Every task remains unchecked until its verification is observed.

## Phase 1: Setup

- [ ] T001 Confirm the owner-authorized training project and its registry remain isolated, coordinate default-branch failure tests, and establish a project-scoped method for failed, pending, and timed-out Sonar gates without shared changes, using `specs/002-simple-cicd/quickstart.md` — DoD: authorization, isolation, and safe test method are verified; if a gate method is unavailable, mark those cases unverified and stop before claiming acceptance — Verify: owner/project settings and a non-secret method check.
- [ ] T002 Verify availability of the specified Gradle, scanner, and DinD images and select available PCG-proxied Docker 27.3.1 CLI and Java 21 JRE tags for `specs/002-simple-cicd/plan.md` — DoD: selected exact tags and non-secret availability evidence are recorded in `specs/002-simple-cicd/quickstart.md`; unavailable images require owner review, not fallback — Verify: registry access and version/architecture inspection.

## Phase 2: Foundational — blocking prerequisites

- [ ] T003 Verify `SGP-Test-K8s` isolation from unrelated workloads, DinD privilege and shared TLS certificates, registry connectivity, protected default branch, and runner configuration against `specs/002-simple-cicd/quickstart.md` — DoD: approved design can operate securely; stop for owner review if not — Verify: runner and project settings plus a safe TLS/connectivity check without exposing credentials.
- [ ] T004 Verify `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, scanner/server compatibility, project gate, and registry write access for `specs/002-simple-cicd/plan.md` — DoD: managed configuration works and token permissions are least-privilege without disclosing values — Verify: project settings and safe access checks.
- [ ] T005 Verify job-specific credential isolation, including automatically supplied GitLab job tokens, against `specs/002-simple-cicd/quickstart.md` — DoD: build/test jobs cannot use Sonar or registry-write credentials, Sonar access is limited to analysis, and registry write access to publication; stop for owner review if unenforceable — Verify: controlled access checks and project/runner credential settings, without printing secrets.
- [ ] T006 [P] Configure project dependency resolution through `https://repo.pouchen.com/repository/maven-proxy-group/` in `build.gradle` without changing application dependencies — DoD: existing dependencies resolve without public repositories — Verify: dependency resolution in the approved CI image.
- [ ] T007 [P] Configure Gradle plugin resolution through `https://repo.pouchen.com/repository/maven-proxy-group/` in `settings.gradle` — DoD: existing plugin markers resolve without public repositories — Verify: plugin resolution in the approved CI image.
- [ ] T008 Confirm `build.gradle` and `settings.gradle` work together with Java 21 and installed Gradle 8.14.4, while `gradle/wrapper/gradle-wrapper.properties` stays unchanged — DoD: existing tests run without a lab connection and the Boot JAR builds — Verify: `gradle --version` and `gradle test bootJar` in the approved image; run `./gradlew test` and `./gradlew bootJar` locally when dependencies are available.

**Checkpoint**: Complete T001–T008 before enabling or running the replacement pipeline. Record safe evidence in `specs/002-simple-cicd/quickstart.md`; a failed prerequisite is a stop condition.

## Phase 3: User Story 1 — Build, review, and publish an image (P1; MVP)

**Goal**: For an eligible push, test and build the application, pass analysis and the gate, and publish the exact built JAR as a commit-specific image.

**Independent test**: In the authorized training project, separately push directly and merge an approved merge request to the default branch; verify ordered successful stages and full-SHA registry images. Confirm non-default pushes and unmerged merge requests do not start this pipeline.

### Implementation

- [ ] T009 [US1] Replace the Pages configuration in `.gitlab-ci.yml` with workflow rules allowing only `push` to `$CI_DEFAULT_BRANCH`, three ordered build/analysis/image stages, and the `SGP-Test-K8s` runner — DoD: no Pages or deployment job remains and other pipeline sources/refs are excluded — Verify: GitLab CI configuration validation and rule review.
- [ ] T010 [US1] Add the build job in `.gitlab-ci.yml` using `repo.pouchen.com/docker-proxy-group/library/gradle:8.14.4-jdk21-alpine` and installed `gradle test bootJar` — DoD: successful tests precede analysis and the executable Boot JAR is unambiguously identified — Verify: job log and JAR outputs in an authorized run; no transfer or lab DB access.
- [ ] T011 [US1] Configure `build.gradle` and `.gitlab-ci.yml` to collect the exact executable JAR, compiled production classes, and scanner-required dependency JARs as build artifacts — DoD: later jobs receive same-run outputs, not caches or rebuilt JARs, with no `.env` or credentials; artifact size and retention are verified — Verify: inspect safe artifact metadata and compare paths/contents across jobs.
- [ ] T012 [US1] Add the specified SonarScanner CLI analysis job in `.gitlab-ci.yml` using transferred classes and libraries, the three managed `SONAR_*` variables, `sonar.qualitygate.wait=true`, and a 300-second timeout — DoD: same commit is analyzed and only a passing gate permits the image stage; unavailable service, errors, failed gate, and timeout fail closed — Verify: CI validation and authorized analysis/gate outcomes without logging secrets.
- [ ] T013 [P] [US1] Add `Dockerfile` using the verified PCG-proxied Java 21 JRE and only the exact transferred executable JAR — DoD: image contains the JAR and runtime, not credentials or `.env`; it does not run the application during build — Verify: inspect Dockerfile and staged JAR path; T017 verifies the built image without starting the application.
- [ ] T014 [P] [US1] Add `.dockerignore` to exclude `.env`, credentials, unrelated secrets, and unnecessary build context while allowing the exact staged JAR required by `Dockerfile` — DoD: required JAR remains available and secrets cannot enter the context — Verify: inspect exclusion and inclusion rules with safe test fixtures; T017 verifies the effective context and image.
- [ ] T015 [US1] Add the image job in `.gitlab-ci.yml` with the verified PCG-proxied Docker 27.3.1 client, `repo.pouchen.com/docker-proxy-group/library/docker:27.3.1-dind-alpine3.20`, secured TLS, and least-privilege registry authentication — DoD: after gate success, the exact build artifact is built and pushed to the project registry under the full commit SHA, without `latest` or deployment; build/push errors fail the job — Verify: authorized job status, image tag, and artifact/image JAR comparison without exposing credentials.
- [ ] T016 [US1] Exercise successful direct-push and approved-merge workflows and excluded event types in `specs/002-simple-cicd/quickstart.md` — DoD: both eligible runs publish after all three stages; non-default pushes, unmerged merge requests, and schedule/web/API/other non-push events start no pipeline — Verify: retain non-secret source/ref, stage, gate, image-tag, and approval evidence from the authorized training project.
- [ ] T017 [US1] Verify concurrent eligible commits, artifact/image provenance, secret exclusion, and removal of Pages in `specs/002-simple-cicd/quickstart.md` — DoD: distinct full-SHA tags and matching JARs are observed; no secrets, deployment, transfer, or Pages job appear; loss of Pages publication is recorded — Verify: safe registry, artifact, image, context, and job inspection; do not delete images.

**Checkpoint**: US1 includes fail-closed stage ordering; do not enable or claim an MVP that can publish before the gate passes. US2 validates and, if necessary, corrects its failure behavior.

## Phase 4: User Story 2 — Stop publication when review fails (P2)

**Goal**: Demonstrate that build/test, analysis, service, or gate failures prevent image creation and that image failures are reported accurately.

**Independent test**: On the implemented US1 pipeline, separately induce build/test failure, analysis failure, and failed gate; inspect the failed run and confirm the image stage never starts. Also check pending and timed-out gates and publication failures.

- [ ] T018 [US2] Exercise separate test failure and build failure in the authorized project using `specs/002-simple-cicd/quickstart.md` — DoD: each run fails and neither analysis nor image stage starts — Verify: record non-secret job and stage results; restore fault injections through reviewed commits.
- [ ] T019 [US2] Exercise separate analysis failure, analysis-service unavailability, and failed gate using `specs/002-simple-cicd/quickstart.md` — DoD: each run fails and image creation never starts — Verify: record safe stage/gate evidence using the verified project-scoped method; do not change shared Sonar settings.
- [ ] T020 [US2] Exercise a pending gate that later passes and a separate gate exceeding 300 seconds using `specs/002-simple-cicd/quickstart.md` — DoD: image waits for the pass in the first run; timeout fails without image creation in the second — Verify: safe timestamps, gate results, and stage outcomes; if the safe method is unavailable, stop and report these cases unverified.
- [ ] T021 [US2] Exercise separate image-build and registry-push failures after a passing gate using `specs/002-simple-cicd/quickstart.md` — DoD: each image job and run fails without reporting successful publication — Verify: safe stage/registry outcome evidence and reviewed reverts; do not delete registry data.
- [ ] T022 [US2] Correct any observed failure-propagation or gate-wait defect in `.gitlab-ci.yml` without weakening the approved design — DoD: all applicable T018–T021 outcomes satisfy the specification; if no defect is observed, document that no edit was needed — Verify: repeat affected controlled scenarios and inspect GitLab statuses.

**Checkpoint**: US2 depends on the US1 pipeline and is independently verifiable by its own failure scenarios; it is not an independent implementation of the pipeline.

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T023 Reconcile observed results and outstanding blockers with `specs/002-simple-cicd/quickstart.md` — DoD: evidence distinguishes verified results from unexecuted cases, contains no secrets, and all temporary test changes have reviewed reverts — Verify: compare the recorded scenario list with pipeline results and repository history.
- [ ] T024 Review `.gitlab-ci.yml`, `Dockerfile`, `.dockerignore`, `build.gradle`, and `settings.gradle` against `specs/002-simple-cicd/plan.md` — DoD: only approved CI/image scope is present, credentials are not exposed, transfer behavior and wrapper are unchanged, and no deployment or unauthorized standards writeback exists — Verify: inspect the change diff, configuration, and safe logs/artifacts.

## Coverage Matrix

| Source | Tasks |
|---|---|
| FR-001, FR-002; US1 scenarios 1–4 | T009, T016, T017 |
| FR-003, FR-004; build, artifact and scanner decisions | T006–T012, T015, T016 |
| FR-005; US2 failure and gate cases | T012, T018–T020, T022 |
| FR-006, FR-007; image and registry outcomes | T011, T013–T015, T017, T021–T022 |
| FR-008, FR-009; no deploy and observable outcomes | T009, T015–T017, T018–T024 |
| Runner, TLS, least privilege, and secret isolation | T002–T005, T011–T015, T017, T024 |
| Approved test environment and safe failure controls | T001, T016–T023 |

## Dependencies & Execution Order

- Setup T001–T002 → Foundation T003–T008 → US1 T009–T017 → US2 T018–T022 → final review T023–T024.
- T006 and T007 are independent edits; T008 requires both. T013 and T014 are independent file edits after T011 establishes the staged JAR path and T002 verifies the runtime tag; T015 requires T011–T014 and verified TLS/credential prerequisites.
- US2 tests require the US1 pipeline; fail-closed behavior is already part of US1, so P2 must not defer that essential safety control. The story tests are separately executable, but controlled default-branch runs must be coordinated.
- Do not merge or enable the replacement configuration until foundational environment and security checks pass. Gate-failure acceptance requires the project-scoped test method from T001; report missing capability instead of altering shared services.

## Parallel Execution Examples

- **US1**: After foundation and selection of the runtime tag, T013 (`Dockerfile`) and T014 (`.dockerignore`) can be implemented in parallel; integrate and verify them together before T015.
- **US2**: No tasks are marked parallel: T018–T021 use the same authorized default-branch test environment and evidence guide, and fault injections and reviewed reverts must be coordinated. They may be scheduled independently only if isolation and separate evidence ownership are first verified.

## Implementation Strategy

1. Complete setup and foundational checks; obtain an owner decision on any failed assumption before proceeding.
2. Deliver US1 as the MVP with all three stages and fail-closed ordering; validate its direct-push and approved-merge success paths and exclusions before claiming it works.
3. Validate US2 failure, pending, timeout, and image-error scenarios and correct any observed defects. The full feature is not complete until required scenarios are verified or explicitly reported as blocked.
4. Reconcile safe evidence and review the approved scope; do not deploy, execute the transfer, access the lab database, delete registry images, or change shared Sonar gates.
