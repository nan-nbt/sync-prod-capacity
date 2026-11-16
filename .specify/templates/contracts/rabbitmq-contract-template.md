# 🐇 RabbitMQ Message Contract

## 1. Interface Summary (Summary)
- **Feature Name**: [Message Name, e.g., Payroll Calculation Task]
- **Related Requirement**: [User Story ID, e.g., US-01]
- **Role**: `[Producer / Consumer]`
- **Exchange**: `[e.g., py.payroll.exchange]`
- **Exchange Type**: `[Direct / Topic / Fanout / Headers]`
- **Routing Key**: `[e.g., calculation.start]`
- **Queue**: `[e.g., py.payroll.calculation.queue]` (For Consumer)
- **Description**: [Briefly describe the purpose of this message, e.g., place payroll calculation requests into a queue for workers to process sequentially.]

---

## 2. Message Properties (Message Properties)

| Property Name | Required | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `messageId` | Yes | [Unique identifier] | `UUID` |
| `timestamp` | Yes | [Send timestamp] | `1698765432100` |
| `contentType` | Yes | [Content format] | `application/json` |
| `deliveryMode` | Yes | [Persistence setting] | `2` (Persistent) |
| `priority` | No | [Priority] | `0-9` |
| `headers` | No | [Custom headers] | `{ "x-trace-id": "..." }` |

---

## 3. Message Content (Message Body / Payload)
*Content-Type: application/json*

### Schema Definition
| Field Name | Type | Required | Description | Validation Rules / Notes |
| :--- | :--- | :--- | :--- | :--- |
| `[taskId]` | `String` | Yes | [Task ID] | |
| `[command]` | `String` | Yes | [Command] | `START_CALCULATION` |
| `[params]` | `Object` | Yes | [Parameters] | |

### Example JSON
```json
{
  "taskId": "TASK-202310001",
  "command": "START_CALCULATION",
  "params": {
    "masterId": "M202310001",
    "salaryType": "SAL01",
    "targetEmployees": ["EMP001", "EMP002"]
  }
}
```

---

## 4. Processing Logic & Scenarios (Processing Logic & Scenarios)

### Trigger Timing (Producer) / Processing Logic (Consumer)
- **Producer**:
    - [Describe when this message should be sent, e.g., after the user clicks the calculate button, the API server sends this message to the Exchange.]
- **Consumer**:
    - [Describe processing logic after receiving the message, e.g., worker listens to the queue and executes a long-running calculation task after receiving the message.]

### Idempotency & Retry (Idempotency & Retry)
- **Idempotency Key**: `[e.g., taskId]` (Consumer should check whether this ID has already been processed)
- **Ack Mode**: `[Auto / Manual]` (Manual Ack is recommended)
- **Retry Policy**:
    - [Describe the retry strategy, e.g., Nack and requeue after processing failure, or send to a Retry Exchange (TTL + DLX).]
    - [Dead Letter Exchange (DLX): route to `py.payroll.dlx` after exceeding retry attempts.]

---

## 5. Configuration Details (Configuration Details)

- **Exchange Durable**: `[Yes / No]`
- **Queue Durable**: `[Yes / No]`
- **Queue Exclusive**: `[Yes / No]`
- **Queue AutoDelete**: `[Yes / No]`
- **TTL (Time To Live)**: `[ms]` (Optional)
- **Max Priority**: `[Number]` (Optional)
