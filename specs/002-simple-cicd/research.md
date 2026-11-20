# Research: Simple CI/CD Pipeline

## Decision 1: Trigger and pipeline boundary

- **Decision**: Run only for pushes to the default branch, including direct and merge-result pushes. Never run on non-default branches or unmerged merge requests.
- **Rationale**: Owner confirmed the trigger and accepts a post-merge quality gate. GitLab project settings, not this pipeline, enforce merge approvals and branch protection.
- **Alternatives considered**: Merge-request/pre-merge pipeline and unfiltered branch pipelines would change the agreed behavior.

## Decision 2: Build, tests and dependency access

- **Decision**: CI uses installed Gradle 8.14.4 and Java 21 from `repo.pouchen.com/docker-proxy-group/library/gradle:8.14.4-jdk21-alpine` to run `gradle test bootJar`. Resolve dependencies and plugins through `https://repo.pouchen.com/repository/maven-proxy-group/`. Keep the existing Gradle 8.14.3 wrapper for local use unchanged.
- **Rationale**: Owner supplied the image and approved the CI/local patch difference; this avoids assuming the public wrapper distribution is reachable. The Maven proxy is documented for Maven Central and Gradle plugins in G2 Solution › PCG Repo Sever Info.
- **Alternatives considered**: Existing wrapper download in CI (public runner guidance documents no external connectivity); unknown internal wrapper mirror; skipping tests (owner rejected).
- **Verification**: Confirm image versions, proxy availability and existing build/plugin resolution in the actual job. Do not assume these checks passed. Existing automated tests must not connect to the lab database.

## Decision 3: Artifact and image provenance

- **Decision**: Pass the exact executable JAR and compiled analysis inputs from the build job as GitLab artifacts. Build the image from that JAR and push to the project GitLab container registry under the full commit SHA.
- **Rationale**: Preserves tested-artifact provenance; distinct commit tags do not race for a moving tag. SHA tags are not inherently immutable and a rerun may replace the same tag.
- **Alternatives considered**: `repo.pouchen.com/docker-pcc-local` (owner chose project GitLab registry and confirmed required exception approval); mutable `latest`; rebuilding the JAR in the image job.
- **Verification**: Owner confirmed registry access and protected configuration; verify them and artifact retention/size in implementation without disclosing credentials.

## Decision 4: Quality analysis and gate

- **Decision**: Use `repo.pouchen.com/docker-pcc-group/sonarsource/sonar-scanner-cli:11.4.0.2044_7.2.0`, PCG-managed Sonar configuration and CI variables `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`. Supply compiled classes and required dependency libraries, wait for the gate with a 300-second timeout, and fail closed.
- **Rationale**: Owner supplied the scanner image and approved these variable names and managed settings. Failed analysis, unavailable service, missing gate or timeout must prevent image creation.
- **Alternatives considered**: Gradle Sonar plugin; fail-open or indefinite wait. CLI and five-minute fail-closed behavior were selected by the owner.
- **Verification**: Owner states Sonar settings and token are configured; check scanner/server compatibility, project gate and access in the actual environment. Never record or print secret values.

## Decision 5: Runner, image builder and runtime

- **Decision**: Run on `SGP-Test-K8s`; use an internally proxied matching Docker 27.3.1 client and `repo.pouchen.com/docker-proxy-group/library/docker:27.3.1-dind-alpine3.20` service with TLS. Package only the JAR in a PCG-proxied Java 21 JRE runtime image, single Linux/amd64 architecture.
- **Rationale**: Owner supplied the DinD service, confirmed runner support and approved the matching client/TLS approach and smaller JRE runtime. A Docker service requires a client and a secure connection.
- **Alternatives considered**: Rootless BuildKit, privileged setup assumed without verification, reuse of the larger Gradle image as runtime, multi-architecture Buildx, deployment. None selected.
- **Verification**: Confirm exact matching client and JRE tags are available, service privileges and certificate sharing work, and registry access is configured. If they do not, stop and ask the owner for an alternative rather than weakening TLS or claiming runner support.

## Decision 6: Secrets and runtime safety

- **Decision**: Use least-privilege protected/masked CI credentials, restrict build context and artifacts to exclude `.env` and secrets, and do not launch the application or connect to the lab DB in CI.
- **Rationale**: The application reads `.env` and running it can trigger a data transfer. Git ignore alone does not protect the Docker context. Owner confirmed protected variables and branch settings, and confirmed any required exception approval for CI-managed secrets instead of assuming Vault.
- **Alternatives considered**: Trust `.gitignore` as Docker exclusion, bake `.env` into image, or run a database smoke test; all rejected.
- **Verification**: Check protected-branch/runner/variable behavior, safe logging and absence of secrets in image and artifacts.

## Decision 7: Failure validation

- **Decision**: The owner identified `https://pcggit.pouchen.com/pci-dev-ai/training/speckit-etl-anan` as the isolated training project and explicitly authorized controlled failures on its default branch and registry.
- **Rationale**: Default-branch push-only rules must be exercised in an eligible pipeline. Confirm isolation and coordinate test runs before execution; no transfer, lab database access, shared gate changes or registry deletion.
- **Alternatives considered**: Assume an unidentified separate project; disable eligibility restrictions; access the lab DB; none selected.
- **Verification**: Use test-scoped failure injection and reviewed reverts, exercise all scenarios in [quickstart.md](quickstart.md), and retain evidence.

## Company guidance and deviations

- G2 Solution › GitLab Runner List documents `SGP-Test-K8s` and external network restrictions. The owner confirmed runner support/connectivity; actual job validation remains necessary.
- G2 Solution › Pou Chen Spring Boot Project Development Guidelines describes a pre-merge quality gate, `repo.pouchen.com/docker-pcc-local` and deployment. The owner confirmed approval for this project's post-merge gate and GitLab registry; deployment is explicitly excluded.
- `docs/tech-stack.md` mentions multi-arch Buildx, `.env` metadata and Vault. Owner confirmed required project-specific approval for one architecture, no release `.env` and protected CI secrets. Do not globally change that guidance.
- `docs/rules/spring-boot.md` recommends internal Maven/plugin repositories. The plan uses the documented Maven proxy instead of assuming direct external access.

## Research conclusion

The owner has decided the material design and confirmed environment setup/required exception approvals. The plan is ready for task generation. Runner capabilities, image availability, project settings and all acceptance outcomes remain owner-reported or untested until implementation verifies them; a failure is a stop condition, not permission to substitute another design.
