# Tasks: Simple CI/CD Pipeline

**Input**: `specs/002-simple-cicd/spec.md`, `plan.md`, `research.md`, `data-model.md`, and `quickstart.md`

**Gate**: Owner approved `timeout: 10m` per job, one-day artifact expiry, and a Gradle dependency-only cache. Eligible successful default-branch pipelines now attempt registry publication automatically. Before running such a pipeline, verify runner isolation, credential boundaries, registry destination and variable-override controls. Record no secret values.

**Scope**: Exactly three stages for build, code review and Docker image. No deployment, application behavior changes, transfer execution, database access, or unrelated infrastructure.

## Phase 1: Prerequisites — Implementation Complete; Verification Open

- [x] T001 Verify required Gradle, SonarScanner, Docker DinD and Java 21 JRE image availability, tool versions and Maven proxy access in `specs/002-simple-cicd/quickstart.md` — DoD: requested tags pull, Gradle 8.14.4 and Java 21 are available, and dependencies/plugins resolve — Verify: owner reports successful pipeline operation; supplied CI log demonstrates Docker images can be pulled. Full item treated complete per owner-reported successful pipeline; detailed availability evidence is not retained in this repository.
- [x] T002 Verify the intended publication behavior in `.gitlab-ci.yml` — DoD: successful eligible default-branch runs log in and push; registry authentication and push failures fail the job — Verify: owner reports the current pipeline run succeeded after unconditional login/push was enabled, indicating that run completed the configured login/push commands. The supplied detailed log predates this change; a post-change log and registry artifact evidence are not attached. Authentication/push failure tests remain separate and unverified.
- [ ] T003 Verify CI job credential isolation in `specs/002-simple-cicd/quickstart.md` — DoD: build cannot access Sonar or registry-write credentials; code-review can access only required Sonar credentials and cannot write to registry; docker-image has intended registry credentials — Verify: approved negative access checks, including automatically supplied `CI_JOB_TOKEN`/registry credentials; stop if isolation is unenforceable. **Not verified by the reported successful run.**
- [ ] T004 Verify privileged runner isolation and Docker daemon network boundary in `specs/002-simple-cicd/quickstart.md` — DoD: runner configuration and safe concurrent test show the daemon is isolated to the intended job; restore authenticated TLS before publication — Verify: runner administrator review and approved isolation test. Current port 2375 mode is plaintext and unauthenticated. **Not verified by a successful pipeline run.**
- [ ] T005 Verify SonarQube scanner/server compatibility and a reversible project-scoped method to test pass, pending, failed and timed-out gates in `specs/002-simple-cicd/quickstart.md` — DoD: tests require no shared Sonar configuration changes and no secret disclosure — Verify: project settings and approved non-secret fault-injection procedure. **Successful-path status may be covered by the reported pipeline; reversible failure/pending/timeout test method is not confirmed.**

## Phase 2: User Story 1 — Build, review and publish an image (P1; MVP) — Implementation Complete; Verification Open

**Goal**: For eligible default-branch pushes, build and test the Boot JAR, pass the quality gate, then automatically publish the same artifact as a commit-specific image.

**Independent test**: An eligible successful push completes all three stages and publishes the image. The owner reports a successful pipeline. The supplied log confirms build and image creation, but prints `Preflight: image push disabled`; registry publication and excluded-trigger behavior are not confirmed by that log. Test registry-push failure separately using an approved controlled method.

- [x] T006 [US1] Replace Pages and configure push-to-default-branch rules and exactly ordered `build`, `code-review`, `docker-image` stages in `.gitlab-ci.yml` — DoD: Pages is removed; every job uses `SGP-Test-K8s`, `timeout: 10m`, and only eligible push pipelines run — Verify: configuration is implemented; owner reports a successful eligible pipeline. CI Lint and excluded-trigger coverage remain unrecorded.
- [x] T007 [US1] Implement the Gradle `build` job, dependency cache and one-day successful artifacts in `.gitlab-ci.yml` — DoD: specified Gradle image runs `gradle --no-daemon clean test bootJar`; exports `build/libs/*.jar`, a uniquely selected executable JAR, compiled classes and runtime libraries; cache is dependency-only — Verify: owner reports successful pipeline execution. Cold/warm cache behavior and artifact retention/access inspection remain unrecorded.
- [x] T008 [US1] Implement SonarQube `code-review` job in `.gitlab-ci.yml` with the specified scanner image, `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, transferred analysis files and `-Dsonar.qualitygate.wait=true` — DoD: the same commit is analyzed, gate wait is bounded to 300 seconds, all scanner/gate failures fail the job and block the image stage — Verify: owner reports successful pipeline execution, indicating the successful analysis path passed. CI Lint and pending/failure/timeout scenarios remain unrecorded.
- [x] T009 [P] [US1] Configure `Dockerfile` to use `repo.pouchen.com/docker-proxy-group/azul/zulu-openjdk-alpine:21.0.13.1-21.54-jre` and copy only the staged executable JAR — DoD: image contains the application artifact and Java 21 JRE, not application secrets — Verify: supplied job log shows successful pull and build from this base image and staged JAR; architecture/security content inspection not separately recorded.
- [x] T010 [P] [US1] Configure `.dockerignore` to admit only `Dockerfile` and the staged JAR while excluding `.env` and unrelated files — DoD: required jar enters context and secrets do not — Verify: supplied job log confirms the Docker build context loaded; context exclusions are configured, though a safe-fixture inspection is not recorded.
- [x] T011 [US1] Verify Docker DinD publication using the requested image/service and GitLab registry credentials — DoD: after `code-review` succeeds, it builds, logs in via standard input and pushes `$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA`; job fails on build/login/push failure — Verify: implementation is complete and the owner reports a successful run with unconditional publication enabled, consistent with login/push completing. The post-change job log and registry artifact evidence are not retained here; authentication/push failure cases are unverified. DinD uses plaintext TCP; isolation and authenticated transport remain unverified.
- [ ] T012 [US1] Validate successful direct/default-branch merge paths, excluded triggers, stage order, image provenance and no deployment in `specs/002-simple-cicd/quickstart.md` — DoD: both eligible push paths publish the build artifact; non-default pushes, unmerged merge requests and non-push events do not run — Verify: owner reports a successful eligible run; distinct merge-path, excluded-trigger and retained registry evidence are not provided.

## Phase 3: User Story 2 — Block publication on failure (P2) — Verification Open

**Goal**: Demonstrate that build, analysis, quality-gate, image-build and registry-push failures are reported and cannot falsely indicate successful publication.

**Independent test**: In the authorized isolated project, induce build, analysis, gate, image-build and registry-push failures separately; confirm earlier failures block later steps and publication failures are reported.

- [ ] T013 [US2] Validate build/test failures, Sonar analysis/service failures, failed gate, pending gate and timeout in `specs/002-simple-cicd/quickstart.md` — DoD: pre-image failures fail pipeline without running Docker image job; pending waits, pass proceeds, timeout fails closed — Verify: use the verified project-scoped tests; do not change shared Sonar configuration. **Failure, pending and timeout scenarios are not evidenced by the successful pipeline report.**
- [ ] T014 [US2] Validate Docker build and registry push failures in `specs/002-simple-cicd/quickstart.md` — DoD: each failure reports failed job/pipeline and never claims successful publication — Verify: use approved reversible injection and preserve non-secret results. **Failure-injection scenarios are not evidenced by the reported successful pipeline.**

## Final Phase: Cross-Cutting Verification — Review Complete; Acceptance Evidence Open

- [x] T015 Review `.gitlab-ci.yml`, `Dockerfile`, `.dockerignore` and `specs/002-simple-cicd/quickstart.md` against `specs/002-simple-cicd/plan.md` — DoD: exact three-stage names/order, images, runner tags, per-job timeouts, cache/artifacts, credential/DinD network controls and absence of deployment are reviewed; report publication and plaintext daemon isolation evidence accurately — Verify: repository changes reviewed; local Gradle tests passed earlier in this work. The review is complete, with GitLab CI Lint, publication log/registry evidence and plaintext daemon isolation documented as outstanding.

## Dependencies and Execution Order

- T001 and implementation of the Docker job are complete. Verification of credential boundaries, runner/DinD isolation and controlled gate tests remains open.
- US1 order: T006 → T007 → T008 → T011 → T012. T009 and T010 can be implemented in parallel once the staged JAR path is fixed; T011 requires both.
- Run remaining US2 scenarios in the authorized project: verify isolation and credential controls, exercise trigger exclusions and controlled failure cases, and retain eligible publication evidence when available.

## Parallel Opportunities

- T009 (`Dockerfile`) and T010 (`.dockerignore`) touch separate files and can be done in parallel after agreeing the staged artifact path.

## Implementation Strategy

1. Complete T001–T005, including GitLab variable/runner settings review, credential boundaries, runner isolation and authorized gate-test method, before running eligible publication pipelines.
2. Complete US1 checks: build, analysis, image build, digest/provenance checks and excluded-trigger checks; verify the actual registry publication result.
3. Exercise pre-image failures, image-build failure and controlled registry-push failure; review non-secret evidence with the owner.
4. Final behavior remains automatic publication on successful eligible pipelines with exactly three stages.
