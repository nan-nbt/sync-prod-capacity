# Technology Stack

## Backend

1. Java 21 (LTS), using `record` for immutable data structures; Virtual Threads are enabled only when an I/O-bound workload genuinely benefits from them
2. Spring Boot 3.5.x as the baseline version for ETL modules; each sub-project should align with its actual runtime version
3. Gradle (Groovy DSL) as the build tool, supporting multi-module ETL projects
4. Unit and integration testing: JUnit 5 + Mockito
5. Common ETL libraries include Apache Commons, Log4j2, Iceberg, Parquet, Hadoop, AWS SDK v2, MariaDB, and project-specific custom connectors
6. When a module needs access to confidential external resources, use Vault to manage credentials and connection parameters
7. Log4j2 is used for log collection; environments requiring centralized log management enable Graylog
8. Spring Security applies only to modules exposing protected HTTP endpoints; ETL batch jobs do not require it by default
9. Long-running service modules deployed on k8s use Spring Boot Actuator to provide health check and probe endpoints
10. Swagger/OpenAPI applies only to modules exposing a REST API; ETL batch jobs do not require it by default
11. GitLab CI/CD builds and tags each deployable sub-project's release artifact from a root `.env` version/type/name triplet; Docker Buildx produces the resulting versioned, multi-arch container image

## Database

- Database technology MUST follow the actual storage layer of the target module; for the current ETL baseline, refer to the database engine and table-handling libraries defined in the job module and sample code
