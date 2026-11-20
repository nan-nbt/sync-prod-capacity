# Quickstart and Validation Guide

This guide describes validation of the owner-reviewed design; it is not evidence that the pipeline has been implemented or passed. The owner identified `https://pcggit.pouchen.com/pci-dev-ai/training/speckit-etl-anan` as the isolated training project and authorized controlled failure testing on its default branch. Confirm isolation and coordinate tests before execution. Do not run a transfer, access the lab database, change shared Sonar quality gates, delete registry data, or expose credentials.

## Prerequisites

- `SGP-Test-K8s` with verified availability of the owner-supplied images:
  - `repo.pouchen.com/docker-proxy-group/library/gradle:8.14.4-jdk21-alpine`
  - `repo.pouchen.com/docker-pcc-group/sonarsource/sonar-scanner-cli:11.4.0.2044_7.2.0`
  - `repo.pouchen.com/docker-proxy-group/library/docker:27.3.1-dind-alpine3.20`
- Verify the matching internally proxied Docker CLI and Java 21 JRE runtime image, DinD privileges and TLS certificate sharing. Stop for owner review if the runner or images cannot support the approved design.
- Verify the internal Maven proxy resolves dependencies and plugins: `https://repo.pouchen.com/repository/maven-proxy-group/`. The CI image supplies installed Gradle 8.14.4 and Java 21; the repository wrapper remains at Gradle 8.14.3 for local use.
- Owner confirms the project GitLab container registry, protected branch and credentials are configured. Verify access, privileged runner isolation, TLS and job-specific credential isolation: Sonar token only in analysis, registry write credentials only in image publication, including checks of automatically supplied job tokens. Do not put credentials in source, logs, artifacts, image or chat.
- PCG-managed SonarQube and protected CI variables `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`; verify scanner compatibility and the configured project gate. Failure or timeout after 300 seconds prevents image creation.
- Ensure `.env` and other secrets are excluded from Docker context, artifacts and image. Tests must not use a database connection.

## Local application checks

From the repository root, when local wrapper dependencies are available:

```sh
./gradlew test
./gradlew bootJar
```

Expected: tests succeed without a lab connection and an executable JAR appears under `build/libs/`. Local commands use the existing Gradle 8.14.3 wrapper; CI intentionally uses installed Gradle 8.14.4 from the image. These checks do not prove the CI pipeline works.

## CI build check

After implementation, in the approved CI build image run:

```sh
gradle --version
gradle test bootJar
```

Expected: Gradle 8.14.4, Java 21, successful local-only tests and Boot JAR. The build job publishes the executable JAR and scanner inputs as GitLab artifacts. See [data-model.md](data-model.md) for required outputs and transitions.

## Authorized training-project end-to-end validation

After implementation and prerequisite verification, exercise the following in the owner-authorized training project. Its default branch and test registry may be used for controlled failures. Coordinate any shared access; use test-scoped failure injection and reviewed reverts. Establish and verify a project-scoped method to produce failed, pending and timed-out gate results without changing shared SonarQube configuration; if unavailable, stop and report those cases as unverified. Do not remove images. Record pipeline source/ref, stage results, gate result, tag and push outcome without exposing secrets. The pipeline's normal rules remain default-branch push-only.

1. Push directly to the training project's default branch; expect build/test, analysis and passing gate, then image build/push. Compare the JAR extracted from the built image to the build artifact; verify `.env` and secrets are absent.
2. Merge an approved merge request to the training default branch; expect the same successful push pipeline. Verify approval and branch protection separately; the pipeline itself does not prevent merge.
3. Push a non-default branch and open an unmerged merge request: neither starts this pipeline. Confirm schedule, web, API and other non-push default-branch events do not start it.
4. Separately inject test/build failure, analysis failure, failed gate and analysis-service unavailability; each must fail without starting image creation. Hold a test-scoped gate result pending and verify waiting, then allow a pass; in a separate run exceed 300 seconds and verify failure without image creation.
5. Separately inject image-build failure and registry-push failure after a passing gate. Each must fail without claiming successful publication. Verify no secret values appear in job logs or artifacts.
6. Run concurrent eligible commits and confirm distinct full-SHA tags, no required `latest` tag, visible stage results, no deployment and no transfer execution. SHA tags are not guaranteed immutable on reruns.
7. Confirm the old Pages job is absent and document the resulting loss of GitLab Pages publication. Restore test changes via reviewed commits; do not delete images or change shared services without separate approval.

Retain evidence and distinguish expected behavior from observed results. These scenarios have not yet been executed.
