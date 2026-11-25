# Production Capacity Synchronizer

A training and examination utility for manually synchronizing production-capacity records from `production_capacity` to `production_capacity_anan` in the same PostgreSQL database. For a requested number of calendar days, including the run date, it inserts missing target records, updates records whose synchronized values differ, and leaves identical and unrelated target records unchanged.

This utility is intended for manual use with a configured lab/test database, not for production deployment. Automated tests use test doubles and do not connect to a lab database. CI builds and tests the application, runs SonarQube analysis, and publishes a commit-SHA-tagged container image; it does not run the transfer or deploy the application.

## Requirements

- Java 21
- PostgreSQL database configured for the transfer
- For container image builds: Docker
- For the documentation site: Node.js 20 or newer and npm

## Configure the database

Create a `.env` file in the project root with the connection settings below. Start from `.env.example` and replace the placeholders with values for the authorized lab/test database. Do not commit `.env` or share credentials in logs.

```dotenv
POSTGRES_URL=jdbc:postgresql://<host>:5432/<database>
POSTGRES_USERNAME=<username>
POSTGRES_PASSWORD=<password>
POSTGRES_DRIVER_CLASS_NAME=org.postgresql.Driver
```

## Build and test the application

Run the Java tests and build the executable Spring Boot JAR with the Gradle wrapper:

```bash
./gradlew clean test bootJar
```

The JAR is generated under `build/libs/`.

## Run a transfer

Run the JAR with a positive integer number of calendar days. The selected window includes today and uses the fixed UTC+08:00 offset. For example, to process today and the previous four calendar days:

```bash
java -jar build/libs/<application-jar>.jar --days=5
```

A run requires the `.env` file described above. The utility is explicitly invoked; it is not scheduled or started automatically. Invalid input or a transfer failure returns a non-zero exit code. On success, the CLI reports the total number of rows inserted or updated. Review the configured database and requested window carefully before running against any real data.

## Container image

The root `Dockerfile` packages the built JAR in an internal Java 21 JRE image. Build it after the CI-style image staging step has created `image-input/app.jar`:

```bash
docker build -t production-capacity-synchronizer .
```

The image contains the application only; database configuration must be supplied externally at runtime. The GitLab pipeline publishes an image tagged with the commit SHA after the build/tests and SonarQube quality gate succeed. It does not execute the transfer or deploy the image.

## CI pipeline

`.gitlab-ci.yml` permits pipelines only for pushes to the default branch. It runs three ordered stages:

1. `build` — clean, test, and build the Boot JAR.
2. `code-review` — run SonarQube analysis and wait for the quality gate.
3. `docker-image` — build and push the image to the GitLab project registry using the commit SHA as its tag.

The jobs use the `SGP-Test-K8s` runner. SonarQube and registry access require the corresponding GitLab CI/CD configuration. The pipeline does not deploy the image or run a database transfer.

## Documentation site

This repository also contains a Docusaurus documentation site for project requirements and meeting minutes. From the repository root:

```bash
npm install
npm run start
```

Build the static site with:

```bash
npm run build
```

The generated site is placed in `build/`; the Java application build output is also under `build/` in its Gradle subdirectories.

## Project references

- [Application specification](specs/001-sync-production-capacity/spec.md)
- [CI/CD implementation plan](specs/002-simple-cicd/plan.md)
- [Database schema documentation](docs/database-schema.md)
- [Example environment configuration](.env.example)
