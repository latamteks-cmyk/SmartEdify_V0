# Design Document

## Overview

The Assembly Service implementation follows the established SmartEdify architecture patterns while providing comprehensive assembly management capabilities. The design emphasizes incremental delivery starting with a Fast-track MVP and evolving through well-defined phases toward the full vision of hybrid assembly management with legal compliance and auditability.

## Architecture

### Service Structure

Following the established SmartEdify service template:

```
apps/services/assembly-service/
├── cmd/
│   └── server/              # main.ts - service entry point
├── internal/
│   ├── app/                 # application layer - commands, queries, handlers
│   ├── domain/              # domain layer - aggregates, events, policies
│   ├── adapters/
│   │   ├── http/            # HTTP handlers, routers, DTOs
│   │   ├── repo/            # PostgreSQL repositories
│   │   ├── bus/             # Event bus integration (NATS/Kafka)
│   │   └── ext/             # External service clients (Auth, Tenant, etc.)
│   └── config/              # Configuration management with Zod validation
├── migrations/              # Database migrations
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests with mocked dependencies
│   └── contract/           # Contract tests against OpenAPI spec
├── api/
│   └── openapi.yaml        # API specification (already exists)
├── Dockerfile
├── .env.example
└── README.md
```

### Domain Model

#### Core Aggregates

1. **Assembly Aggregate**
   - Root entity managing assembly lifecycle
   - States: Draft → Validated → Notified → CheckInOpen → InSession → MinutesDraft → Signed → Published → Archived
   - Contains agenda items, metadata, and configuration

2. **Attendee Aggregate**
   - Manages participant registration and check-in
   - Tracks accreditation status (presencial/virtual)
   - Links to tenant membership and voting coefficients

3. **Vote Aggregate**
   - Manages voting sessions for agenda items
   - Implements anti-replay with JTI tokens
   - Tracks vote results with weighted calculations

4. **Minutes Aggregate**
   - Manages assembly minutes generation and signing
   - Implements WORM storage requirements
   - Handles digital signatures and timestamps

#### Domain Events

Following the established event naming convention `v1.<domain>.<aggregate>.<action>`:

- `v1.assembly.assembly.created`
- `v1.assembly.assembly.validated`
- `v1.assembly.assembly.published`
- `v1.assembly.attendee.checked_in`
- `v1.assembly.vote.opened`
- `v1.assembly.vote.cast`
- `v1.assembly.vote.closed`
- `v1.assembly.minutes.generated`
- `v1.assembly.minutes.signed`

## Components and Interfaces

### HTTP API Layer

Implements the existing OpenAPI specification with the following key endpoints:

- **Assembly Management**: CRUD operations for assemblies
- **Agenda Validation**: Integration with Compliance service
- **Call Publishing**: Integration with Communication service
- **Attendee Management**: Check-in and accreditation
- **Voting Operations**: Vote opening, casting, and results
- **Minutes Management**: Generation, signing, and publishing

### Application Layer

#### Command Handlers
- `CreateAssemblyHandler`
- `ValidateAgendaHandler`
- `PublishCallHandler`
- `RegisterCheckInHandler`
- `OpenVotingWindowHandler`
- `CastVoteHandler`
- `GenerateMinutesHandler`

#### Query Handlers
- `GetAssemblyHandler`
- `ListAssembliesHandler`
- `GetVoteResultsHandler`
- `GetMinutesHandler`

#### Event Handlers
- `AssemblyCreatedHandler` - triggers agenda validation
- `AttendeeCheckedInHandler` - updates quorum calculations
- `VoteCastHandler` - updates vote tallies
- `MinutesGeneratedHandler` - triggers notification workflows

### Integration Layer

#### External Service Clients

1. **Auth Service Client**
   - JWT token validation
   - User authentication and authorization
   - MFA step-up for sensitive operations

2. **Tenant Service Client**
   - Membership validation
   - Governance role verification
   - Voting coefficient retrieval

3. **User Service Client**
   - User profile information
   - Contact details for notifications

4. **Compliance Service Client** (Future)
   - Agenda validation
   - Legal requirement verification

5. **Communication Service Client** (Future)
   - Convocation notifications
   - Result announcements

6. **Document Service Client** (Future)
   - Minutes storage and signing
   - WORM archive implementation

### Data Layer

#### Database Schema

Core tables following PostgreSQL best practices:

```sql
-- Assemblies
CREATE TABLE assemblies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    type assembly_type NOT NULL,
    modality assembly_modality NOT NULL,
    status assembly_status NOT NULL DEFAULT 'Draft',
    title VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agenda Items
CREATE TABLE agenda_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assembly_id UUID NOT NULL REFERENCES assemblies(id),
    title VARCHAR(255) NOT NULL,
    decision_type decision_type NOT NULL,
    majority_type majority_type NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attendees
CREATE TABLE attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assembly_id UUID NOT NULL REFERENCES assemblies(id),
    user_id UUID NOT NULL,
    channel check_in_channel,
    checked_in_at TIMESTAMPTZ,
    voting_coefficient DECIMAL(10,4) DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agenda_item_id UUID NOT NULL REFERENCES agenda_items(id),
    voter_id UUID NOT NULL,
    token_jti VARCHAR(255) NOT NULL UNIQUE,
    value vote_value NOT NULL,
    coefficient DECIMAL(10,4) NOT NULL DEFAULT 1.0,
    cast_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Outbox for event publishing
CREATE TABLE outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(255) NOT NULL,
    event_id UUID NOT NULL UNIQUE,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);
```

## Error Handling

### Error Response Format

Following the established SmartEdify error format:

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  details?: Array<{
    field?: string;
    code: string;
    message: string;
  }>;
  traceId?: string;
}
```

### Error Categories

1. **Validation Errors (400)**: Invalid request data, business rule violations
2. **Authentication Errors (401)**: Invalid or missing JWT tokens
3. **Authorization Errors (403)**: Insufficient permissions for operation
4. **Not Found Errors (404)**: Requested resource doesn't exist
5. **Conflict Errors (409)**: Operation conflicts with current state
6. **Internal Errors (500)**: Unexpected system failures

### Retry and Circuit Breaker Patterns

- Implement exponential backoff for external service calls
- Circuit breaker pattern for critical dependencies
- Graceful degradation when non-critical services are unavailable

## Testing Strategy

### Unit Testing

- **Domain Logic**: Comprehensive testing of aggregates, entities, and domain services
- **Application Handlers**: Testing command and query handlers with mocked dependencies
- **Utilities**: Testing helper functions and validation logic
- **Target Coverage**: >80% for domain and application layers

### Integration Testing

- **Database Operations**: Testing repositories with test database
- **Event Publishing**: Testing outbox pattern and event emission
- **External Service Integration**: Testing with mocked external services
- **Configuration**: Testing environment variable validation

### Contract Testing

- **OpenAPI Compliance**: Validate all endpoints against the specification
- **Request/Response Schemas**: Ensure proper serialization/deserialization
- **Error Responses**: Validate error format consistency
- **Authentication**: Test JWT validation and authorization

### End-to-End Testing

- **Assembly Lifecycle**: Complete flow from creation to minutes publication
- **Voting Process**: Full voting workflow with multiple participants
- **Error Scenarios**: Testing failure modes and recovery
- **Performance**: Load testing for voting scenarios

## Security Considerations

### Authentication and Authorization

- JWT token validation for all protected endpoints
- Role-based access control using tenant governance roles
- Step-up MFA for sensitive operations (vote opening, minutes signing)

### Data Protection

- Encryption at rest for sensitive assembly data
- TLS 1.3 for all external communications
- PII redaction in logs and error messages

### Anti-Fraud Measures

- JTI token validation to prevent vote replay
- Voter/item locking to prevent double voting
- Audit trail for all critical operations
- Rate limiting for vote submission endpoints

## Observability

### Metrics

Following Prometheus naming conventions:

**Business Metrics:**
- `assembly_created_total{type,modality}`
- `assembly_attendee_checkin_total{channel}`
- `assembly_vote_cast_total{item_id,value}`
- `assembly_minutes_generated_total`

**Technical Metrics:**
- `assembly_http_requests_total{method,route,status}`
- `assembly_http_request_duration_seconds`
- `assembly_external_service_calls_total{service,operation,status}`
- `assembly_database_operations_total{operation,table}`

### Tracing

OpenTelemetry instrumentation for:
- HTTP request/response cycles
- Database operations
- External service calls
- Event publishing and consumption
- Business operation spans (voting, check-in, etc.)

### Logging

Structured logging with:
- Request correlation IDs
- User and tenant context
- Operation outcomes
- Error details with stack traces
- Performance metrics