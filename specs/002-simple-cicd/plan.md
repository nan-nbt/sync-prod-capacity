# Implementation Plan: Simple CI/CD Pipeline

**Branch**: `feat/002-simple-cicd` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

**Status**: Owner-reviewed design, ready for `/speckit.tasks`. No implementation or end-to-end verification has been performed. The environment and security checks below must pass before the pipeline is enabled; failed checks stop execution rather than silently changing the design.

## Summary

Replace the GitLab Pages pipeline with a pipeline triggered only by pushes to the default branch. Run automated tests and build a Boot JAR; run SonarQube analysis and wait at most five minutes for a passing quality gate; then build and push a commit-SHA-tagged Docker image to this project's GitLab container registry. Never deploy or run the transfer. This is a post-merge gate and does not enforce merge approvals.

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
- **Dependencies**: GitLab CI; SonarScanner CLI image `repo.pouchen.com/docker-pcc-group/sonarsource/sonar-scanner-cli:11.4.0.2044_7.2.0`; Docker CLI with owner-supplied Docker-in-Docker service `repo.pouchen.com/docker-proxy-group/library/docker:27.3.1-dind-alpine3.20`; Java 21 JRE runtime image from the PCG Docker proxy.
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
| CONST-REVIEW-1 | Pass for owner-reviewed planning direction. | Pass for task planning: owner approved material choices and exception authority. Implementation completion still requires passing tests and acceptance evidence. |

## Implementation Details

- **File paths**: Replace `.gitlab-ci.yml`; add root `Dockerfile` and `.dockerignore`. Update `build.gradle` and `settings.gradle` as needed to route dependency and plugin resolution through `https://repo.pouchen.com/repository/maven-proxy-group/`. Do not change the Gradle wrapper or application behavior.
- **Build**: Verify the supplied image has Java 21 and Gradle 8.14.4, then run `gradle test bootJar`. Use the installed Gradle, not `./gradlew`, inside CI. Resolve project dependencies and Gradle plugins through the internal Maven proxy, including Java analysis dependencies. The wrapper remains local Gradle 8.14.3.
- **Artifacts**: Transfer the exact executable Boot JAR, compiled production Java classes and scanner-required dependency JARs from the successful build to subsequent jobs using GitLab artifacts. Identify the executable JAR unambiguously and do not use caches as artifact provenance. Ensure `.env` and credentials cannot enter artifacts or the Docker build context.
- **Analysis**: Use the specified SonarScanner CLI image and protected CI variables `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`; map existing managed configuration to them. Scan the same commit using the transferred compiled classes and libraries; set quality-gate waiting to true and timeout to 300 seconds. Fail closed on errors, failed gate, unavailable service or timeout.
- **Image and registry**: Use a matching PCG-proxied Docker 27.3.1 client and the specified DinD service, with TLS and registry authentication passed securely. Select and verify an available approved Java 21 JRE base image from the PCG Docker proxy; copy only the exact built JAR. Push to the project GitLab registry using predefined CI registry variables with the full commit SHA as tag, no `latest`. SHA naming does not make registry tags immutable.
- **Rules and ordering**: Pipeline-level rules permit only source `push` and ref equal to default branch; all other sources/refs are excluded. Build/test → analysis/gate → image build/push; only successful earlier stages permit later ones. Project settings independently govern merge approval and branch protection.
- **Security / ACL**: Owner confirms registry writable, branch protected, appropriate runner and protected/masked credentials configured, and DinD support. Limit Sonar tokens to analysis and registry write credentials to publication; verify build/test jobs cannot use them, including any automatically supplied job token. Protected/masked variables alone do not enforce job isolation. Validate access controls and logs, and verify privileged runner isolation from unrelated workloads as well as service privilege and shared TLS certificate setup. If required isolation or TLS is unavailable, stop and ask the owner rather than weakening security.
- **Error format / observability**: Native job/stage statuses and safe logs distinguish failures; no credential or record-value logging.
- **Batch behavior**: N/A; no transfer performed or changed.
- **Deployment**: None. The image packages the CLI. A separately authorized manual run still requires valid `--days` and external lab-only `.env` configuration; no secrets are embedded.
- **Rollback**: Revert pipeline changes through a reviewed commit. Do not delete registry images without separate approval. Restoring Pages or deploying requires a separate decision.

**Owner Review Gate**: Owner approved the scope, trigger, ordering, tests, registry, SHA tag, five-minute gate, post-merge limitation, provided images, DinD with TLS, Gradle version difference, Java 21 JRE runtime, exception approvals and controlled test use of this training project. Runtime base-image tag and Docker client image are selected from the approved internal proxy and verified during implementation; failed verification requires a decision, not a silent fallback.

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

**Structure Decision**: Keep the existing single-project layout. `/speckit.tasks` creates `tasks.md` separately.

## Needs Clarification

None outstanding for task generation. Operational verification is not represented as an approved fact: perform the checks below during implementation and stop before publication if any fail.

## Implementation and Acceptance Prerequisites

1. Confirm supplied Gradle image is reachable and has Gradle 8.14.4 and Java 21. Verify internal Maven proxy resolves existing dependencies and plugin markers without public access.
2. Confirm the Sonar scanner image and selected Java 21 JRE and matching Docker CLI images are available through PCG registry; verify scanner compatibility with managed server, Java bytecode and `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`. Do not disclose values.
3. Verify DinD service starts on `SGP-Test-K8s`, supports required privileges and secured TLS certificate sharing, and reaches the registry; verify protected branch and credentials are effective. If any assumption fails, stop and obtain an owner-approved alternative.
4. Confirm this training project and registry remain isolated and that controlled failure tests on its default branch are authorized before test execution. Establish and verify a project-scoped method to induce failed, pending and timed-out gates without changing shared Sonar settings; if unavailable, stop and report those tests as unverified. Do not run the transfer, access lab DB, delete registry data, or alter shared quality gates. Use test-scoped fault injection and revert test changes through reviewed commits.
5. Exercise all success, exclusion, gate wait/timeout, analysis, build, image build and push failure cases in [quickstart.md](quickstart.md), retaining safe evidence. Tests are not yet run.

## Authoritative Source Writeback List

| Target | Change summary | Status |
|---|---|---|
| None | Owner-approved deviations are specific to this feature; no global technology-guidance writeback was authorized. | N/A |

## Complexity Tracking

No added application component is required. CI/image publication is an explicitly owner-approved scope exception; it does not alter transfer behavior.
