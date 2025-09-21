# Implementation Plan

- [ ] 1. Set up Assembly Service project structure and foundation
  - Create service directory structure following SmartEdify template
  - Set up TypeScript configuration and build system
  - Create package.json with necessary dependencies
  - Set up environment configuration with Zod validation
  - Create basic Dockerfile and .env.example
  - _Requirements: 1.1, 1.2_

- [ ] 2. Implement core domain models and aggregates
  - Create Assembly aggregate with state machine (Draft → Validated → Notified → etc.)
  - Implement AgendaItem entity with validation rules
  - Create Attendee aggregate for participant management
  - Implement Vote aggregate with anti-replay mechanisms
  - Define domain events following v1.assembly.* naming convention
  - _Requirements: 2.1, 3.3, 3.4_

- [ ] 3. Set up database infrastructure and migrations
  - Create PostgreSQL migration scripts for core tables (assemblies, agenda_items, attendees, votes)
  - Implement outbox table for event publishing
  - Set up database connection and configuration
  - Create repository interfaces and implementations
  - Add database health checks
  - _Requirements: 1.1, 3.4, 4.1_

- [ ] 4. Implement basic HTTP server and health endpoints
  - Set up Express server with middleware (CORS, logging, error handling)
  - Implement /health endpoint with database connectivity check
  - Add request correlation ID middleware
  - Set up OpenTelemetry tracing instrumentation
  - Configure structured logging with pino
  - _Requirements: 1.5, 4.1, 4.2, 4.3_

- [ ] 5. Implement Assembly CRUD operations (MVP scope)
  - Create POST /assemblies endpoint for assembly creation
  - Implement GET /assemblies/{id} endpoint for assembly retrieval
  - Add GET /assemblies endpoint with filtering and pagination
  - Create DTOs and validation schemas using Zod
  - Implement basic business validation rules
  - _Requirements: 2.1, 2.2, 4.4_

- [ ] 6. Implement attendee registration and check-in (MVP scope)
  - Create POST /assemblies/{id}/attendees endpoint for attendee registration
  - Implement check-in logic with channel validation (presencial/virtual)
  - Add attendee status tracking and quorum calculation
  - Emit assembly.attendee.registered domain events
  - Create attendee repository and database operations
  - _Requirements: 2.2, 2.3, 3.1_

- [ ] 7. Implement basic voting functionality (MVP scope)
  - Create POST /assemblies/{id}/votes endpoint for vote casting
  - Implement binary voting logic (favor/contra/abstencion)
  - Add JTI token validation for anti-replay protection
  - Implement voter/item locking to prevent double voting
  - Create vote result calculation and storage
  - _Requirements: 2.2, 2.3, 3.3_

- [ ] 8. Implement basic minutes generation (MVP scope)
  - Create GET /assemblies/{id}/minutes endpoint for minutes retrieval
  - Implement basic minutes generation from assembly data
  - Add minutes draft creation and storage
  - Emit assembly.minutes.generated domain events
  - Create minutes repository and basic PDF generation stub
  - _Requirements: 2.2, 2.3, 3.4_

- [ ] 9. Set up event publishing infrastructure
  - Implement outbox pattern for reliable event publishing
  - Create event publisher service with retry logic
  - Set up event schemas and validation
  - Add event publishing to all domain operations
  - Implement DLQ handling for failed events
  - _Requirements: 1.2, 2.3, 4.3_

- [ ] 10. Implement authentication and authorization
  - Add JWT middleware for token validation
  - Integrate with Auth Service for token verification
  - Implement RBAC based on tenant roles
  - Add authorization checks for all protected endpoints
  - Create user context extraction and validation
  - _Requirements: 1.3, 5.1, 5.2_

- [ ] 11. Add external service integration clients
  - Create Auth Service client for token validation
  - Implement Tenant Service client for membership data
  - Add User Service client for profile information
  - Implement proper timeout and retry mechanisms
  - Add circuit breaker patterns for resilience
  - _Requirements: 1.3, 1.4, 4.5_

- [ ] 12. Implement comprehensive error handling
  - Create standardized error response format
  - Add validation error handling with detailed messages
  - Implement business rule violation error responses
  - Add proper HTTP status codes for all scenarios
  - Create error logging and monitoring
  - _Requirements: 4.4, 4.3_

- [ ] 13. Add Prometheus metrics and observability
  - Implement business metrics (assemblies created, votes cast, etc.)
  - Add technical metrics (HTTP requests, database operations, etc.)
  - Set up metrics collection and export
  - Create custom metrics for assembly-specific operations
  - Add performance monitoring for critical paths
  - _Requirements: 1.5, 4.3, 4.1_

- [ ] 14. Implement comprehensive unit tests
  - Write unit tests for all domain aggregates and entities
  - Create tests for application command and query handlers
  - Add tests for repository implementations
  - Test error scenarios and edge cases
  - Achieve >80% code coverage for domain and application layers
  - _Requirements: 6.1, 6.4_

- [ ] 15. Create integration tests with mocked dependencies
  - Set up test database for integration testing
  - Create integration tests for HTTP endpoints
  - Mock external service dependencies (Auth, Tenant, User)
  - Test event publishing and outbox functionality
  - Add database transaction and rollback testing
  - _Requirements: 6.3, 6.4_

- [ ] 16. Implement contract tests against OpenAPI specification
  - Set up contract testing framework (Spectral/Schemathesis)
  - Validate all endpoints against existing OpenAPI spec
  - Test request/response schema compliance
  - Validate error response formats
  - Add contract test automation to CI pipeline
  - _Requirements: 6.2, 6.4_

- [ ] 17. Add security hardening and validation
  - Implement input validation and sanitization
  - Add rate limiting for vote submission endpoints
  - Implement step-up MFA validation for sensitive operations
  - Add audit logging for all critical operations
  - Encrypt sensitive data at rest
  - _Requirements: 5.3, 5.4, 5.5, 3.2_

- [ ] 18. Create end-to-end tests for critical user journeys
  - Test complete assembly creation to minutes generation flow
  - Create multi-user voting scenario tests
  - Test error recovery and failure scenarios
  - Add performance tests for voting load scenarios
  - Validate event publishing and consumption end-to-end
  - _Requirements: 6.5, 6.4_

- [ ] 19. Set up CI/CD pipeline and deployment configuration
  - Create GitHub Actions workflow for testing and building
  - Add Docker image building and publishing
  - Set up deployment configuration for staging/production
  - Add health check validation in deployment pipeline
  - Configure environment-specific settings
  - _Requirements: 1.1, 4.1_

- [ ] 20. Create documentation and operational runbooks
  - Write comprehensive README with setup and usage instructions
  - Document API endpoints and integration patterns
  - Create operational runbooks for common scenarios
  - Add troubleshooting guides and monitoring instructions
  - Document deployment and configuration procedures
  - _Requirements: 4.1, 4.3_