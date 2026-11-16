# 📨 Kafka Message Contract

## 1. Interface Summary (Summary)
- **Feature Name**: [Message Name, e.g., Payroll Calculation Completed Notification]
- **Related Requirement**: [User Story ID, e.g., US-01]
- **Role**: `[Producer / Consumer]`
- **Topic**: `[e.g., py.payroll.calculation.events]`
- **Consumer Group**: `[e.g., py-payroll-service-group]` (For Consumer)
- **Description**: [Briefly describe the purpose of this message, e.g., send this event after payroll calculation is completed to notify downstream systems to generate reports.]

---

## 2. Message Key & Headers (Key & Headers)

### Message Key
- **Key Strategy**: `[e.g., masterId]` (used for partition ordering)
- **Key Type**: `[String / Long / Avro]`

### Message Headers
| Header Name | Required | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `messageId` | Yes | [Unique identifier] | `UUID` |
| `timestamp` | Yes | [Send timestamp] | `1698765432100` |
| `contentType` | Yes | [Content format] | `application/json` |
| `[Custom Header]` | No | [Custom header] | `[Value]` |

---

## 3. Message Content (Message Value / Payload)
*Serialization: [JSON / Avro / Protobuf]*

### Schema Definition
| Field Name | Type | Required | Description | Validation Rules / Notes |
| :--- | :--- | :--- | :--- | :--- |
| `[eventId]` | `String` | Yes | [Event ID] | |
| `[eventType]` | `String` | Yes | [Event type] | `CALCULATION_COMPLETED` |
| `[payload]` | `Object` | Yes | [Business data] | |

### Example JSON
```json
{
  "eventId": "EVT-202310001",
  "eventType": "CALCULATION_COMPLETED",
  "timestamp": "2023-10-31T10:00:00Z",
  "payload": {
    "batchId": "B123",
    "masterId": "M202310001",
    "status": "SUCCESS",
    "processedCount": 100
  }
}
```

---

## 4. Processing Logic & Scenarios (Processing Logic & Scenarios)

### Trigger Timing (Producer) / Processing Logic (Consumer)
- **Producer**:
    - [Describe when this message should be sent, e.g., send after `PayrollService` completes calculation and commits the DB transaction.]
- **Consumer**:
    - [Describe processing logic after receiving the message, e.g., query calculation results and generate a PDF report after receiving the event.]

### Idempotency & Retry (Idempotency & Retry)
- **Idempotency Key**: `[e.g., eventId]` (Consumer should check whether this ID has already been processed)
- **Retry Policy**:
    - [Describe the retry strategy, e.g., whether the consumer retries locally or routes to a Retry Topic after processing failure.]
    - [Dead Letter Queue (DLQ): route to `py.payroll.dlq` after exceeding retry attempts.]

---

## 5. Configuration Details (Configuration Details)

- **Partitions**: `[e.g., 3]`
- **Replication Factor**: `[e.g., 3]`
- **Retention Policy**: `[e.g., 7 days / Compact]`
- **Min In-Sync Replicas**: `[e.g., 2]`
