# Feature Specification: Simple CI/CD Pipeline

**Feature Branch**: `feat/002-simple-cicd`

**Created**: 2026-11-19

**Status**: Draft

**Input**: Replace the existing GitLab CI configuration with a small pipeline that builds a Boot JAR, performs SonarQube analysis with an enforced quality gate, and builds and pushes a Docker image. Run it for pushes to the default branch, including changes merged from approved merge requests. Do not deploy. Confirm necessary variables and configuration during planning.

## Clarifications

### Session 2026-11-19

- Q: When should the pipeline be triggered? → A: Only on pushes to the default branch, including changes merged from approved merge requests.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build, review, and publish an image (Priority: P1)

As a project maintainer, I want changes reaching the default branch to be built, reviewed for code quality, and packaged into a published image so I can obtain a reviewed image without manually running each step.

**Why this priority**: The three ordered stages and image publication are the complete requested workflow.

**Independent Test**: Push a change to the default branch, including one merged from an approved merge request, with a build and analysis that pass; inspect the run's stage outcomes and confirm the resulting image is present in the configured registry.

**Acceptance Scenarios**:

1. **Given** a push to the default branch containing an approved merge request's changes and the necessary services and configuration, **When** the pipeline runs and the build, analysis, quality gate, and image publication succeed, **Then** the stages complete in order and the built image is available in the configured registry.
2. **Given** a direct push to the default branch and the necessary services and configuration, **When** the pipeline runs and the build, analysis, quality gate, and image publication succeed, **Then** the same ordered workflow publishes the image.
3. **Given** a push to a non-default branch or a merge request that has not been merged, **When** that event occurs, **Then** this pipeline does not run.
4. **Given** the existing Pages job, **When** the replacement configuration is used, **Then** that job is no longer part of the pipeline.

### User Story 2 - Stop publication when review fails (Priority: P2)

As a project maintainer, I want a failed build, analysis, or quality gate to prevent image publication so that unsuccessful changes are not published by this workflow.

**Why this priority**: The requested quality gate must have an observable effect on the publishing workflow.

**Independent Test**: Exercise runs with a failed build, failed analysis, and failed quality gate, and inspect the results to verify that image build and publication did not start.

**Acceptance Scenarios**:

1. **Given** an eligible pipeline run, **When** the Boot JAR build fails, **Then** the analysis and image stages do not run and the run reports failure.
2. **Given** a successful build, **When** SonarQube analysis fails or its quality gate fails, **Then** the image stage does not run and the run reports failure.
3. **Given** a successful analysis, **When** the quality gate result is still pending, **Then** the pipeline waits for the result before proceeding to the image stage.

### Edge Cases

- If the image build or registry push fails, the run reports failure rather than reporting successful publication.
- SonarQube or registry unavailability, gate-result timeout behavior, duplicate pipelines, registry permissions, and image naming and tagging require owner confirmation during planning; this specification does not decide their handling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST replace the existing GitLab CI configuration, including removal of the existing Pages job.
- **FR-002**: The pipeline MUST run only for pushes to the default branch, including changes merged from approved merge requests; it MUST NOT run for unmerged merge requests or pushes to non-default branches.
- **FR-003**: Each eligible run MUST execute the following stages in order: build the Boot JAR; perform SonarQube analysis and wait for its quality gate; build and push a Docker image.
- **FR-004**: The analysis stage MUST proceed only after a successful Boot JAR build, and the image stage MUST proceed only after a successful analysis and passing quality gate.
- **FR-005**: A failed build, failed analysis, or failed quality gate MUST result in a failed run and prevent the image stage from starting.
- **FR-006**: A successful image stage MUST build an image from the built application and push it to the configured registry.
- **FR-007**: A failed image build or push MUST result in a failed run rather than a successful publication result.
- **FR-008**: The pipeline MUST NOT deploy the application or image.
- **FR-009**: The run MUST expose stage outcomes so a maintainer can distinguish a successful publication from a failed stage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In successful runs triggered by both a direct push and an approved merge reaching the default branch, all three stages complete in order and each run publishes its image to the configured destination.
- **SC-002**: In separately exercised build-failure, analysis-failure, and quality-gate-failure cases, 100% of runs report failure and do not start image creation or publication.
- **SC-003**: In separately exercised image-build and image-push failure cases, 100% of runs report failure rather than successful publication.
- **SC-004**: A maintainer can identify the result of each of the three stages from each tested run; unmerged merge requests and non-default branch pushes do not start this pipeline; no tested run deploys the application or image.

## Assumptions

- The project owner has approved the CI pipeline and image publication as an exception to the application's narrow transfer-focused scope; the application's transfer behavior is unchanged.
- The registry destination, access, image naming and tagging, runner capabilities, SonarQube configuration, variables and secrets, and failure-timeout handling remain decisions for the planning session. The pipeline trigger is limited to pushes to the default branch, including changes merged from approved merge requests. No registry destination is selected by this specification.
- The required build, analysis, quality gate, and registry services will be made available as needed for the workflow; their setup and access details require confirmation during planning.
