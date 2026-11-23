# Quickstart and Validation Guide

This guide describes validation of the planned design; it is not evidence that the pipeline has passed. The owner identified `https://pcggit.pouchen.com/pci-dev-ai/training/speckit-etl-anan` as the isolated training project and authorized controlled failure testing on its default branch. The owner reported project isolation and a project-scoped gate test method, but the recorded evidence does not yet demonstrate a reversible method for failed, pending and timed-out gates. Actual CI-job behavior and acceptance outcomes remain unverified. Coordinate tests before execution. Do not run a transfer, access the lab database, change shared Sonar quality gates, delete registry data, or expose credentials.

## Prerequisites

- `SGP-Test-K8s` with owner-confirmed verified availability of:
  - `repo.pouchen.com/docker-proxy-group/library/gradle:8.14.4-jdk21-alpine`
  - `repo.pouchen.com/docker-pcc-group/sonarsource/sonar-scanner-cli:11.4.0.2044_7.2.0`
  - `repo.pouchen.com/docker-proxy-group/library/docker:27.3.1-dind-alpine3.20` (both image job and DinD service)
  - `repo.pouchen.com/docker-proxy-group/azul/zulu-openjdk-alpine:21.0.13.1-21.54-jre` (owner-selected runtime; actual pull and architecture still require verification)
- Owner-reported image availability, runner isolation, DinD privileges/TLS, registry connectivity, protected branch, and credential isolation require actual-job verification without exposing credentials. The Docker service was unreachable at `tcp://docker:2375` when TLS was disabled. Restore TLS and have the runner administrator verify privileged DinD support and configure the same unique per-job `/certs/client` volume in the build and `docker` service containers. Verify that client certificates are inaccessible to concurrent jobs. Stop for owner review if required isolation fails.
- Keep protected project variable `IMAGE_PUBLISH_ENABLED` unset or `false` during preflight. The Docker job must build but skip registry login and push. After all preflight evidence (including automatic job-token denial from build and code-review) is reviewed and approved, set the variable to `true`; successful eligible default-branch pipelines then publish automatically. This is temporary validation control, not an additional stage or per-run manual approval.
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

## Pipeline configuration and cache checks

Before the first eligible preflight run, review GitLab and runner settings and use the project's GitLab CI Lint in the UI to validate `.gitlab-ci.yml` and inspect the expanded configuration. Verify controls over who may edit or override pipeline/project variables, restrict overrides of `IMAGE_PUBLISH_ENABLED`, `CI_REGISTRY`, `CI_REGISTRY_IMAGE`, Docker host/TLS values and Sonar coordinates, and confirm the image destination is the approved project registry. Perform any necessary negative access tests in an approved isolated setup. Confirm exactly `build`, `code-review`, `docker-image` in that order, `SGP-Test-K8s` and `timeout: 10m` on every job, the exact required images for each stage, the 300-second fail-closed gate and no deployment job. Verify `IMAGE_PUBLISH_ENABLED` unset/false builds but skips login/push, then set it to `true` only after approved preflight evidence; enabled success pipelines publish automatically. Check that image-job `needs` requires both build artifacts and successful `code-review`, and that the image job overrides the DinD image's daemon entrypoint.

Run an authorized cold-cache build and a later warm-cache build without clearing shared caches; verify both run tests and produce same-run artifacts under `build/libs/`, a uniquely selected executable JAR, and scanner inputs. Inspect cache scope and artifact access/expiry without revealing secrets. A cache miss must not affect correctness; confirm retry behavior within the one-day artifact retention and that ten minutes is adequate. Check whether the managed Sonar gate needs test-source or coverage reports; the existing pipeline does not generate a coverage report. Do not change shared settings to make this validation pass.

## Authorized training-project end-to-end validation

After implementation and prerequisite verification, exercise the following in the owner-authorized training project. Its default branch and test registry may be used for controlled failures. Coordinate any shared access; use test-scoped failure injection and reviewed reverts. Establish and verify a project-scoped method to produce failed, pending and timed-out gate results without changing shared SonarQube configuration; if unavailable, stop and report those cases as unverified. Do not remove images. Record pipeline source/ref, stage results, gate result, tag and push outcome without exposing secrets. The pipeline's normal rules remain default-branch push-only.

1. With `IMAGE_PUBLISH_ENABLED` unset/false, push directly to the training project's default branch; expect build/test, analysis and passing gate, then local image build with no registry login/push. Compare the staged JAR digest between build and image jobs; verify `.env` and secrets are absent.
2. Complete credential and per-job TLS isolation checks and confirm variable override/edit controls prevent bypass or credential redirection during preflight.
3. Before publication enablement, inject a Docker build failure; expect the image job and pipeline to fail without any registry login or push.
4. Push a non-default branch and open an unmerged merge request: neither starts this pipeline. Confirm schedule, web, API and other non-push default-branch events do not start it.
5. Separately inject test/build failure, analysis failure, failed gate and analysis-service unavailability; each must fail without starting image creation. Hold a test-scoped gate result pending and verify waiting, then allow a pass; in a separate run exceed 300 seconds and verify failure without image creation.
6. Review all preflight evidence with the owner. Only after approval, set protected `IMAGE_PUBLISH_ENABLED=true`.
7. After enablement, push directly to the training project's default branch; expect all stages and image publication. Merge an approved merge request and verify the same successful push pipeline. Verify approval and branch protection separately; the pipeline itself does not prevent merge.
8. After preflight review and enablement, separately inject registry-push failure after a passing gate. It must fail without claiming successful publication. Verify no secret values appear in job logs or artifacts; use a controlled authorized failure method and do not delete images.
9. Run concurrent eligible commits and confirm distinct full-SHA tags, no required `latest` tag, visible stage results, no deployment and no transfer execution. SHA tags are not guaranteed immutable on reruns.
10. Confirm the old Pages job is absent and document the resulting loss of GitLab Pages publication. Restore test changes via reviewed commits; do not delete images or change shared services without separate approval.

Retain evidence and distinguish expected behavior from observed results. These scenarios have not yet been executed.
