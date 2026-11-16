# 🛠️ Task Development Specification (Task Specification)

## 0. Basic Information
- **Task Number**: [taskXX]
- **Task Name**: [Task Name]
- **Corresponding Requirement**: [User Story ID, e.g., US-01]
- **Module Path**: [Confirmed Module Path, e.g., payroll-calc-india]
- **Dependent Outputs**:
    - **Prerequisites**: [e.g., task01-init-db must be completed first]
- **Reference Documents**:
    - Core Specification: [spec.md](./spec.md)
    - Data Model: [data-model.md](./data-model.md)
    - Interface Contracts: [api-v1.md](./contracts/api-v1.md) / [rabbitmq-event.md](./contracts/rabbitmq-event.md)
    - Drools Spec: [Salary Calculation](drools/salary-calculation-spec.md)
- **Status**: Pending

---

## 1. Implementation Objective
*Adheres to principles: MVP, High Quality, Self-contained - Allow developers to understand core logic without switching modes*
- **Description**: Briefly describe the functional points to be completed by this task.
- **Key Outputs**:
    - **Component**: [e.g., Salary Calculation Component (SalaryCalculator)]
    - **Service**: [e.g., Tax Rule Service (TaxRuleService)]
    - **Interface**: [e.g., POST /api/v1/salary/calculate / RabbitMQ calculation.start]

### Core Logic Description
{Briefly describe the functional logic of this task. If complex, Architect should insert Mermaid flowchart here}

## 2. Implementation Constraints & Boundaries
*Principle: Prevent over-engineering, ensure consistency in multi-person collaboration*

- **Modification Restrictions**: ❌ Prohibit modifying `{shared/AuthUtils.java}`; ❌ Prohibit changing database Schema.
- **External Dependencies**: Must call `{inventory-service}`'s `checkStock` interface.
- **Mock Requirements**: If downstream API or MQ Consumer/Producer is not yet completed, refer to [xxx-mock-data.md](./contracts/xxx-mock-data.md) for Mock implementation.

---

## 3. Implementation Steps
*Adheres to principles: No over-design (YAGNI), precise path*

> **AI Filling Guidelines (AI Instructions)**:
> When generating content for task-**.md, do not leave this guideline, please delete
> 1. **File Classification Principles**:
>    - **Configuration and Infrastructure**: Files like `pom.xml`, `application.yml`, `*Config.java`, `MainApplication.java` are always classified under **Step 1**.
>    - **Core Functions**: Business logic and UI implementation are classified under **Step 3**.
> 2. **Step Responsibility Division**:
>    - **Step 1**: Environment configuration, dependency management, test cases (Test), and skeleton classes.
>    - **Step 2**: Interface, DTO, Schema definitions.
>    - **Step 3**: Core business logic implementation, UI rendering logic.
> 3. **Dynamic Adjustment**: If a step does not require file modifications, delete that step directly.

1. [ ] **Environment Configuration & Test First (Configuration & TDD)**:
    - **Main Objective**: Complete project basic configuration, dependency management, and test environment setup.
    - **Involved Files**:
        - **Dependency Management**: `[pom.xml / build.gradle]`
        - **Application Configuration**: `[src/main/resources/application.yml]`
        - **Java Configuration**: `[src/main/.../config/XxxConfig.java]`
        - **Test Cases**: `[src/test/.../XxxTest.java]`
    - **Verification**: Ensure project is compilable, configurations load correctly, tests fail (Red).

2. [ ] **Interface and Type Definitions (Interface/Schema)**:
    - **Main Objective**: Establish frontend-backend contracts and data structures.
    - **Involved Files**:
        - **DTO Definitions**: `[src/main/.../XxxDTO.java]`
        - **Interface Contracts**: `[src/main/.../XxxInterface.java]` / `[.docs/<module>/contracts/xxx.md]`
    - **Key Points**: Define Request/Response models, Message Payload, Entity fields, Component Props.

3. [ ] **Core Development**:
    - **Main Objective**: Implement specific business logic and UI behavior.
    - **Involved Files**:
        - **Business Logic**: `[src/main/.../XxxServiceImpl.java]`
        - **UI Components**: `[src/main/.../XxxComponent.tsx]`
    - **Key Points**: Implement Service methods, Repository queries, UI state management.

4. [ ] **Error Handling**:
    - **Main Objective**: Reinforce edge cases and error feedback.
    - **Involved Files**:
        - **Global Exception**: `[src/main/.../GlobalExceptionHandler.java]`
    - **Key Points**: Validate error messages, Loading states, Empty State (this step usually does not involve configuration files).

5. [ ] **Refactoring and Optimization**:
    - **Main Objective**: Improve code quality.
    - **Involved Files**:
        - **[Description]**: `[Files needing optimization]`
    - **Key Points**: Remove Magic Numbers, extract common functions (this step optimizes existing code only).

---

## 4. Checkpoints
> **AI Execution Standards**: When reaching the following checkpoints, must proactively report progress and wait for feedback.

- [ ] **Threshold A (Unit Tests Pass)**:
    - Task: Complete test writing and empty implementations.
    - Verification: Run `mvn test` / `npm test` to ensure testing framework operates normally.
- [ ] **Threshold B (Core Logic Completed)**:
    - **STOP & REPORT**: Briefly describe implementation approach and changed files, and wait for user response "continue" or "OK".
- [ ] **Threshold C (DoD Final Approval)**:
    - Task: Complete all functions and format corrections.
    - Verification: Provide API call examples or UI screenshot descriptions (if supported).

---

## 5. Acceptance & Testing
*Adheres to principles: Testable (Independent Test)*

### Acceptance Criteria (AC)
- [ ] Must comply with [US-XX] acceptance scenarios in [spec.md](./spec.md).
- [ ] **Functional Aspect**: {Describe specific behavior}
- [ ] **State Aspect (FE)**: Ensure performance under different screen sizes and Loading states.
- [ ] **Boundary Aspect (BE)**: Ensure correct HTTP status codes and error messages are returned for invalid inputs.

### Test Execution Command (Verification)
- **Command**: `[e.g., npm test or mvn test]`
- **Expected Result**: [Describe success indicators, frontend usually correct UI rendering, backend JSON or DB changes]
---

## 6. Notes
- **Code Style**: Must add Traditional Chinese comments (JavaDoc).
- **Governance Standards**: After completion, confirm compliance with PR review standards, ensure no over-optimization.
- **Exception Handling**: Ensure appropriate Log and Exception Handling are included.
