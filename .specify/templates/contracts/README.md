# Contracts Templates README

The `contracts/` directory carries feature-level interfaces and interaction contracts (including OpenAPI and GraphQL schemas).

## Existing Templates

- `rabbitmq-contract-template.md`
  - RabbitMQ message contract
- `kafka-contract-template.md`
  - Kafka message contract

## Usage Principles

- HTTP request/response interfaces: Use `contracts/openapi.yaml`, `contracts/openapi.json` as canonical contract
- GraphQL interfaces: Use `contracts/graphql/schema.graphql` (or split schema files) as canonical schema
- Exchange / Queue / Routing Key type messages: Use `rabbitmq-contract-template.md`
- Topic / Consumer Group / Partition type events: Use `kafka-contract-template.md`
- Other technical interfaces such as Webhook, File Exchange, UI Spec:
  - If existing templates can be reasonably applied, use the closest template
  - If it has already appeared repeatedly and the structure is stable, add a dedicated template

## Naming Suggestions

- `openapi.yaml` / `openapi.json`
- `graphql/schema.graphql`
- `rabbitmq-<slug>.md`
- `kafka-<slug>.md`
- `ui-<slug>.md`
- `webhook-<slug>.md`
- `<custom-tech>-<slug>.md`
