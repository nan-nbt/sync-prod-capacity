# Technology Stack

## Backend

1. Java 21 (LTS), leveraging modern features like Virtual Threads and Records
2. Spring Boot 3.2.x or higher version
3. Gradle (Groovy) as build tool
4. Unit testing and integration testing: JUnit 5 + Mockito
5. API documentation handled with Swagger/OpenAPI
6. Use Vault for DB connection credential management
7. Log collection using Log4j2, logs collected to Graylog for centralized log management
8. Security authentication using Spring Security with JWT
9. Future deployment to k8s, need health check endpoints, use Spring Boot Actuator

## Database

- Database uses PostgreSQL 15 or higher version
