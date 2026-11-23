# Tasks: Simple CI/CD Pipeline

**Input**: `specs/002-simple-cicd/spec.md`, `plan.md`, `research.md`, `data-model.md`, and `quickstart.md`

**Gate**: Owner approved `timeout: 10m` per job, one-day artifact expiry, and a Gradle dependency-only cache. Keep protected project variable `IMAGE_PUBLISH_ENABLED` unset/false during preflight. Do not enable publication until credential isolation, per-job DinD TLS isolation and failure-gate checks pass and evidence is reviewed. Record no secret values.

**Scope**: Exactly three stages for build, code review and Docker image. No deployment, application behavior changes, transfer execution, database access, or unrelated infrastructure.

## Phase 1: Prerequisites

- [ ] T001 Verify required Gradle, SonarScanner, Docker DinD and Java 21 JRE image availability, tool versions and Maven proxy access in `specs/002-simple-cicd/quickstart.md` — DoD: requested tags pull, Gradle 8.14.4 and Java 21 are available, and dependencies/plugins resolve — Verify: approved runner/image inspection and a clean build prerequisite check.
- [ ] T002 Establish the temporary publication hold in `.gitlab-ci.yml` using protected project variable `IMAGE_PUBLISH_ENABLED` — DoD: unset/false runs the three stages and Docker image build, but image job neither logs in nor pushes — Verify: CI Lint and controlled default-branch preflight run; inspect job logs and registry to verify no write.
- [ ] T003 Verify CI job credential isolation in `specs/002-simple-cicd/quickstart.md` — DoD: build cannot access Sonar or registry-write credentials; code-review can access only required Sonar credentials and cannot write to registry; docker-image has intended registry credentials — Verify: approved negative access checks, including automatically supplied `CI_JOB_TOKEN`/registry credentials; stop if isolation is unenforceable.
- [ ] T004 Verify privileged runner isolation and per-job Docker TLS certificates in `specs/002-simple-cicd/quickstart.md` — DoD: DinD works securely, and concurrent jobs cannot access each other's client certificates or daemon — Verify: runner configuration review and safe concurrent isolation test; never fall back to insecure TCP.
- [ ] T005 Verify SonarQube scanner/server compatibility and a reversible project-scoped method to test pass, pending, failed and timed-out gates in `specs/002-simple-cicd/quickstart.md` — DoD: tests require no shared Sonar configuration changes and no secret disclosure — Verify: project settings and approved non-secret fault-injection procedure.

## Phase 2: User Story 1 — Build, review and publish an image (P1; MVP)

**Goal**: For eligible default-branch pushes, build and test the Boot JAR, pass the quality gate, then automatically publish the same artifact as a commit-specific image once preflight is completed and publication enabled.

**Independent test**: During preflight, successful and failing pipelines build the image but cannot push; separately, registry-push failure is validated only in an explicitly authorized controlled publication test after preflight review. After evidence review, setting `IMAGE_PUBLISH_ENABLED=true` allows a successful default-branch push to complete all three stages and publish; excluded triggers remain excluded.

- [ ] T006 [US1] Replace Pages and configure push-to-default-branch rules and exactly ordered `build`, `code-review`, `docker-image` stages in `.gitlab-ci.yml` — DoD: Pages is removed; every job uses `SGP-Test-K8s`, `timeout: 10m`, and only eligible push pipelines run — Verify: GitLab CI Lint and expanded configuration review.
- [ ] T007 [US1] Implement the Gradle `build` job, dependency cache and one-day successful artifacts in `.gitlab-ci.yml` — DoD: specified Gradle image runs `gradle --no-daemon clean test bootJar`; exports `build/libs/*.jar`, a uniquely selected executable JAR, compiled classes and runtime libraries; cache is dependency-only — Verify: cold/warm CI builds pass and inspect artifact contents/expiry.
- [ ] T008 [US1] Implement SonarQube `code-review` job in `.gitlab-ci.yml` with the specified scanner image, `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, transferred analysis files and `-Dsonar.qualitygate.wait=true` — DoD: the same commit is analyzed, gate wait is bounded to 300 seconds, all scanner/gate failures fail the job and block the image stage — Verify: CI Lint and approved success/pending/failure/timeout cases without exposing credentials.
- [ ] T009 [P] [US1] Configure `Dockerfile` to use `repo.pouchen.com/docker-proxy-group/azul/zulu-openjdk-alpine:21.0.13.1-21.54-jre` and copy only the staged executable JAR — DoD: image contains the application artifact and Java 21 JRE, not application secrets — Verify: verify base image pull/architecture and inspect Dockerfile; do not run the transfer application.
- [ ] T010 [P] [US1] Configure `.dockerignore` to admit only `Dockerfile` and the staged JAR while excluding `.env` and unrelated files — DoD: required jar enters context and secrets do not — Verify: inspect effective context using safe fixtures.
- [ ] T011 [US1] Implement the Docker DinD job in `.gitlab-ci.yml` with the exact requested image/service, per-job TLS, GitLab registry credentials and `IMAGE_PUBLISH_ENABLED` behavior — DoD: preflight builds without login/push; when enabled, only after `code-review` succeeds it logs in via standard input and pushes `$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA`; job fails on build/push failure — Verify: GitLab CI Lint, isolated preflight, then authorized publication after prerequisite evidence is reviewed.
- [ ] T012 [US1] Validate successful direct/default-branch merge paths, excluded triggers, stage order, image provenance and no deployment in `specs/002-simple-cicd/quickstart.md` — DoD: after enablement both eligible push paths publish the build artifact; non-default pushes, unmerged merge requests and non-push events do not run — Verify: retain non-secret GitLab stage, artifact and registry evidence.

## Phase 3: User Story 2 — Block publication on failure (P2)

**Goal**: Demonstrate that build, analysis, quality-gate, image-build and registry-push failures are reported and cannot falsely indicate successful publication.

**Independent test**: With publication held off, induce build, analysis, gate and image-build failures separately; confirm earlier failures block Docker image build. After preflight evidence is reviewed, test registry-push failure in the authorized controlled publication environment and verify failure does not claim publication.

- [ ] T013 [US2] Validate build/test failures, Sonar analysis/service failures, failed gate, pending gate and timeout in `specs/002-simple-cicd/quickstart.md` — DoD: pre-image failures fail pipeline without running Docker image job; pending waits, pass proceeds, timeout fails closed — Verify: use the verified project-scoped tests; do not change shared Sonar configuration.
- [ ] T014 [US2] Validate Docker build failure with push disabled and registry push failure in an authorized enabled publication test in `specs/002-simple-cicd/quickstart.md` — DoD: build failure is tested preflight; push failure reports failed job/pipeline and never claims success — Verify: use approved reversible injection and preserve non-secret results.

## Final Phase: Cross-Cutting Verification

- [ ] T015 Review `.gitlab-ci.yml`, `Dockerfile`, `.dockerignore` and `specs/002-simple-cicd/quickstart.md` against `specs/002-simple-cicd/plan.md` — DoD: exact three-stage names/order, images, runner tags, per-job timeouts, cache/artifacts, credential/TLS controls and absence of deployment are verified; enable publication only after owner review of evidence — Verify: GitLab CI Lint, diff review and acceptance evidence; report any unavailable check as unverified.

## Dependencies and Execution Order

- T001–T005 are prerequisites. Keep `IMAGE_PUBLISH_ENABLED` unset/false until T003–T005 pass and the preflight evidence is reviewed.
- US1 order: T006 → T007 → T008 → T011 → T012. T009 and T010 can be implemented in parallel once the staged JAR path is fixed; T011 requires both.
- Coordinate US2 scenarios in the authorized project: complete preflight checks and review their evidence before enablement; T012 and the push-failure portion of T014 require enabled publication. T015 is the final review after these tests, not a prerequisite to enabling publication.

## Parallel Opportunities

- T009 (`Dockerfile`) and T010 (`.dockerignore`) touch separate files and can be done in parallel after agreeing the staged artifact path.

## Implementation Strategy

1. Complete T001–T005, including GitLab variable/runner settings review and credential/TLS isolation, before the first eligible preflight run; keep `IMAGE_PUBLISH_ENABLED` unset/false.
2. Complete US1 preflight portions only: build, analysis, non-publishing image build, digest/provenance checks and excluded-trigger checks.
3. While push remains disabled, complete pre-image failures and image-build failure. Review all non-secret evidence with the owner; set `IMAGE_PUBLISH_ENABLED=true` only after approved prerequisites and preflight pass.
4. With publication enabled, complete authorized publication success and controlled registry-push failure scenarios. Final behavior remains automatic publication on successful eligible pipelines with exactly three stages.
