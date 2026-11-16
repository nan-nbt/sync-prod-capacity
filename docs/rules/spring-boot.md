# Backend Development Standards

## Core Technology Stack

- Java 21 (LTS), using `record` for immutable data structures; Virtual Threads are enabled only when an I/O-bound workload genuinely benefits from them
- Spring Boot 3.5.x as the baseline version for ETL modules; each sub-project should align with its actual runtime version
- Gradle (Groovy DSL) as the build tool, supporting multi-module ETL projects
- Unit and integration testing: JUnit 5 + Mockito
- Common ETL libraries include Apache Commons, Log4j2, Iceberg, Parquet, Hadoop, AWS SDK v2, MariaDB, and project-specific custom connectors
- DataLake / table-handling libraries MUST follow the version used by the target module and be recorded alongside the module's dependencies

## Backend Code Standards

### Spring Boot

* Use constructor injection for DI; `@Autowired` is prohibited
* Parameters that require external adjustment (timeout, retry count, batch size, schedule, file path, etc.) MUST be supplied via configuration files; hardcoding is prohibited
* When different beans must be injected depending on the runtime context (e.g., a job runner under `@Profile("prod")` or `@Profile("qas")`), use Spring Profiles and configuration parameters to control this; avoid hardcoded `if/else` logic in code
* Prefer a well-known library when one can simplify the problem; do not reinvent the wheel
* Use immutable `record`s appropriately for DTOs and job input/output models
* When data enters through a typed boundary, use Bean Validation annotations (`@Size`, `@Email`, etc.) instead of manual validation
* Use custom exceptions for business or batch-processing failures
* Use `@ControllerAdvice` only when a module exposes HTTP endpoints; in that case it MUST return a unified error DTO

  ```
  ErrorResponse {
      timestamp: number,  // Unix epoch timestamp in milliseconds
      status: number,     // HTTP status code
      error: string,      // Short identifier
      message: string,    // Detailed error message
      path: string        // Request path
  }
  ```

* Job entry points MUST handle only startup, argument parsing, and orchestration; business logic is prohibited in entry points
* Use SLF4J + Log4j2 as the standard logging stack; `System.out.println` is prohibited
* Use lambdas/streams where appropriate, but prioritize readability and batch-processing performance over a strictly functional style
* Use `Optional` where it improves clarity in handling null risk
* Spring Security applies only to modules that actually expose protected HTTP endpoints

### OpenAPI Documentation

- This section applies only to modules exposing a REST API
- When a module provides HTTP endpoints, use Swagger/OpenAPI to define request/response schemas
- When backward compatibility is required, API paths MUST use the `/v{major}` prefix
- Endpoints, parameters, file upload/download, and metadata MUST be documented in detail
- Document the security scheme, including authentication and authorization requirements
- Group endpoints with tags and provide integration examples

## System Architecture and Design Principles

### Directory Structure

Based on the ETL multi-module structure used by `sample_code/bi-pp-etl/`, the project directory maps as follows:

```plaintext
root project
├── common           # shared config, exception, model, service, util
├── <job-module>     # a single ETL job module
│   ├── runner       # job entry point / task launcher
│   ├── model        # job-specific data models
│   ├── service      # ETL orchestration and processing
│   └── service/builder
└── resources        # application config and log config
```

### Directory Descriptions

#### entities (model layer)

- `model` or domain classes define each job module's ETL data structures, transformation payloads, and execution context
- Prefer immutable DTOs (`record`) when the structure is simple and the data should not be mutated
- Create domain-specific exceptions for batch and transformation failure scenarios
- Validation logic that belongs to business or transformation rules MUST remain framework-agnostic so it can be reused across job steps

#### usecases (service layer)

- `runner/task`, `service`, and `service/builder` implement ETL use cases, orchestrating source reads, transformations, and target writes
- Each service MUST receive its required connectors, repositories, or clients via constructor injection and focus on a single business flow
- Orchestration logic MUST be separated from low-level I/O and transformation helper utilities

#### interfaces (common layer)

- Repositories, clients, DTOs, and helper abstractions in the `common` layer provide ports/adapters for external systems such as SAP, Iceberg, Doris, S3, FTP, and mail
- Interfaces MUST NOT be coupled to concrete infrastructure logic; implementations belong to the framework or adapter layer
- Use mapping utilities to convert source data into job-specific output models, keeping concerns separated

#### frameworks (config layer)

- `common/src/main/java/.../config/` and each module's `src/main/java/.../config/` contain environment and connector configuration such as mail, the SAP web client, Iceberg, data sources, and logging
- Application bootstrap classes, task entry points, global exception handlers, and logging-related cross-cutting components belong to this layer
- This layer may also contain monitoring, notifications, and other external-system adapters needed for ETL execution

### Clean Architecture Reference

- Adopt a layered structure where business logic faces inward and infrastructure faces outward
- The dependency direction MUST point inward; inner layers must not depend on outer layers
- Domain/model classes handle business validation and data integrity checks and must have no framework dependencies
- Use cases orchestrate the workflow of each ETL job
- Use interfaces, adapters, and mappers to isolate external dependencies and transformation details

### Logging and Tracing

- Use SLF4J + Log4j2 as the logging standard
- Use MDC to attach context information where available, such as job name, batch run ID, source system, target system, and request ID
- Sensitive information must not be logged
- Prefer structured logging for job progress, success/failure, and key transformation milestones

## Code Refactoring Principles

### DRY Principle

- Identify duplicated logic and extract it into shared utility classes, builder classes, or static domain methods when necessary
- Consider refactoring when the same logic appears more than 3 times

### Refactoring Patterns

- Extract Method: split long methods into smaller ones
- Extract Class: split out single-responsibility classes
- Parameterize Method: control differing behavior via parameters
- Replace Algorithm: replace complex logic with a clearer or more efficient algorithm

### Batch Processing Refactoring

- Extract repeated batch pagination, chunking, or file-parsing logic into shared helper methods
- Keep field-mapping logic within the job module
- When a default sort order or processing order is required, it MUST be explicitly defined

## Unit Testing and Testing Culture

- Backend unit tests use JUnit 5 + Mockito
- Maintain describe groupings, using beforeEach / afterEach for setup and teardown
- Use mock objects to isolate units
- Test coverage MUST reach a meaningful threshold for ETL orchestration, transformation, and connector logic
- Time-dependent tests may use fake timers or mocking mechanisms

## Backend Initialization Notes

### Gradle Configuration

* Use an internal Maven repository, avoiding external repositories to improve security and performance
* Configure pluginManagement repositories in `settings.gradle`
* Use a multi-module structure, with each sub-project aligning its dependencies appropriately
* Add a Docker image build plugin only when a module is packaged as an image for CI/CD

* **Note:** `spring-boot-starter-web` may pull in `spring-boot-starter-logging`; when using `spring-boot-starter-log4j2` it MUST be excluded:

  ```gradle
  configurations.implementation {
      exclude group: 'org.springframework.boot', module: 'spring-boot-starter-logging'
  }
  ```

### Default Profile

`application.yaml` should not globally force a single profile; use environment-driven profiles such as `dev`, `qas`, `prod` depending on the job module and deployment target.

### JWT Authentication and IAM Integration

This section does not apply to ETL batch modules by default. Add Spring Security and IAM integration only when a module exposes protected HTTP endpoints.

### Logging Configuration (Log4j2)

#### System Overview

The ETL platform uses Log4j2 as its logging framework, supporting multi-environment configuration, with Graylog centralized log management enabled when needed. Configuration files should be selected per environment or module.

#### Dependency Configuration

Add the Log4j2-related dependencies in `build.gradle`:

```gradle
dependencies {
    // ... other dependencies
    implementation 'org.springframework.boot:spring-boot-starter-log4j2'
    implementation 'biz.paluch.logging:logstash-gelf:1.15.1'
    // ... other dependencies
}
```

**Note:** `spring-boot-starter-web` may pull in `spring-boot-starter-logging`; when using `spring-boot-starter-log4j2` it MUST be excluded:

```gradle
configurations.implementation {
    exclude group: 'org.springframework.boot', module: 'spring-boot-starter-logging'
}
```

#### Application Configuration

Configure logging-related parameters in `application.yaml`:

```yaml
app:
  name: po-otr-daily
  write-graylog: true

logging:
  file:
    max-size: 100MB

---
spring:
  config:
    activate:
      on-profile: prod
logging:
  config: classpath:log4j2-prod.xml
```

#### Logging Configuration Details

##### 1. Default Configuration (log4j2.xml)

Used for development and test environments, including:

- Console Appender: outputs to the console
- GELF Appender: sends to Graylog when enabled
- RollingFile Appender: rolling file logs
- Job-specific Appender: application-specific logs

##### 2. Production Configuration (log4j2-prod.xml)

Used in production, with the following key differences:

- The GELF target host points to the production Graylog server
- Other settings remain consistent with the default profile

#### Logger Categories

##### 1. Console Logger

- **Purpose**: logs general framework and third-party class output
- **Scope**: all third-party packages and Spring framework logs
- **Output**: Console, RollingFile

##### 2. AppLogger

- **Purpose**: logs output from this project's own code
- **Scope**: all classes under the ETL module packages
- **Output**: Console, job-specific log file, GELF (Graylog)
- **Characteristics**: automatically forwarded to Graylog for centralized management when enabled

#### Log Level Configuration

- **Default level**: INFO
- **SQL debugging**: use DEBUG for JDBC or SQL tracing
- **Verbose tracing**: use TRACE for parameter binding or step-level diagnostics

#### Environment Variable Configuration

The following environment variables are supported to customize the Graylog connection:

- `GRAYLOG_HOST`: Graylog server host
- `GRAYLOG_PORT`: Graylog server port

#### Log File Management

- **File location**: the `./logs/` directory
- **Rotation policy**: rotated by date and file size
- **Compression format**: `.gz`
- **Retention policy**: directory structure retained per month

### Spring Boot Actuator Configuration

When a module is deployed as a long-running service on Kubernetes, add `spring-boot-starter-actuator` to provide health check endpoints.

- When Spring Security is enabled and a module exposes actuator endpoints, the `/actuator/**` path MUST be permitted without authentication in `SecurityConfig`
- Actuator provides `/actuator/health` for Kubernetes probes to check application health
- CronJob-style batch containers do not need to expose actuator endpoints unless deployed as a service

### Swagger OpenAPI Configuration

This section does not apply to ETL batch modules unless the module exposes an HTTP API.

### CORS Configuration

This section does not apply to ETL batch modules unless the module exposes an HTTP API.

### API Probes

Long-running service modules deployed on Kubernetes MUST implement probe functionality.

### Probe Specification

1. **Health check endpoint**: use Spring Boot Actuator's `/actuator/health` as the base health check endpoint for service modules
2. **Path consistency**: if the service is mounted under `/{appName}`, it MUST also support `/{appName}/actuator/health`
3. **Security**: when Spring Security is enabled, health check endpoints MUST be exempt from authentication
4. **K8s probe types**: long-running service modules MUST define both Liveness and Readiness probes
5. **Response format**: health check responses MUST conform to the Actuator standard format; only `status: UP` is considered healthy
6. **Deployment configuration**: probe path, port, initialDelaySeconds, timeoutSeconds, periodSeconds, and failureThreshold MUST be explicitly set in the deployment spec

### Security Configuration Example

```java
.requestMatchers(
    new AntPathRequestMatcher("/actuator/**"),
    new AntPathRequestMatcher("/" + appName + "/actuator/**")
).permitAll()
```

### K8s Probe Example (Reference)

```yaml
livenessProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```
