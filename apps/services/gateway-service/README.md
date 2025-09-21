# Gateway Service

API Gateway for SmartEdify microservices architecture. Provides centralized routing, authentication, rate limiting, and observability.

## Features

### 🔐 Authentication & Authorization
- JWT token validation with role-based access control
- Centralized authentication for all backend services
- Support for admin, user, and tenant-specific permissions
- Optional authentication for public endpoints

### 🚦 Rate Limiting
- Configurable rate limits per endpoint type
- Stricter limits for authentication endpoints
- IP-based and user-based rate limiting
- Graceful error responses with retry information

### 🔄 Service Routing
- Dynamic proxy routing to backend services
- Health check monitoring for all services
- Request/response transformation
- Error handling and fallback responses

### 📊 Observability
- Structured logging with request correlation
- Request ID propagation across services
- Health monitoring and status reporting
- Performance metrics collection

### 🛡️ Security
- CORS configuration with environment-specific origins
- Helmet.js security headers
- Request size limits
- Input validation and sanitization

## Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Frontend      │    │   Mobile App     │
│   (React)       │    │   (React Native) │
└─────────┬───────┘    └─────────┬────────┘
          │                      │
          └──────────┬───────────┘
                     │
          ┌──────────▼───────────┐
          │   Gateway Service    │
          │   (Port 3000)        │
          └──────────┬───────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌───▼────┐ ┌─────▼──────┐
│ Auth Service │ │ User   │ │ Tenant     │
│ (Port 3001)  │ │Service │ │ Service    │
│              │ │(3002)  │ │ (Port 3003)│
└──────────────┘ └────────┘ └────────────┘
```

## Configuration

### Environment Variables

```bash
# Gateway Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# JWT / OIDC
JWKS_URL=http://localhost:3001/.well-known/jwks.json
JWKS_URLS=http://localhost:3001/.well-known/jwks.json
JWKS_CACHE_MAX_AGE=600000
JWKS_COOLDOWN_MS=30000
ISSUER=http://localhost:3001
AUDIENCE=smartedify-gateway

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
TENANT_SERVICE_URL=http://localhost:3003

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Tracing (OTLP)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
# OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=
# OTEL_EXPORTER_OTLP_HEADERS=x-otlp-token=your-token

# Metrics
METRICS_ENABLED=true
METRICS_ROUTE=/metrics
METRICS_PREFIX=gateway_

# Outgoing TLS
OUTGOING_TLS_REJECT_UNAUTHORIZED=true
# OUTGOING_TLS_CA_FILE=/path/to/custom-ca.pem
```

## API Routes

### Public Routes (No Authentication)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Password reset
- `GET /auth/.well-known/jwks.json` - JWKS public keys
 - `GET /metrics` - Prometheus metrics (if enabled)

### Protected Routes (Authentication Required)
- `POST /auth/logout` - User logout
- `POST /auth/refresh-token` - Token refresh
- `GET /auth/userinfo` - User information
 - `POST /oauth/token` - OAuth2 token endpoint (proxied)
 - `POST /oauth/introspect` - OAuth2 introspection (proxied)
 - `POST /oauth/revoke` - OAuth2 token revocation (proxied)
- `GET /api/users` - List users (admin only)
- `GET /api/users/:id` - Get user (owner or admin)
- `PUT /api/users/:id` - Update user (owner or admin)
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile
- `GET /api/preferences` - Get user preferences
- `PUT /api/preferences` - Update user preferences
- `GET /api/tenants` - Tenant operations

### Admin Routes (Admin Role Required)
- `GET /auth/admin/*` - Admin authentication endpoints

### Health & Monitoring
- `GET /health` - Overall system health
- `GET /health/:service` - Individual service health
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
 - `GET /metrics` - Prometheus metrics exposition

## Development

### Setup
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start in development mode
npm run dev
```

### Testing
```bash
# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Run with coverage
npm test -- --coverage
```

### Building
```bash
# Build for production
npm run build

# Start production server
npm start
```

## Request Flow

1. **Request Reception**: Gateway receives request with optional JWT token
2. **Authentication**: JWT validation and user context extraction
3. **Authorization**: Role-based access control and tenant validation
4. **Rate Limiting**: Request rate validation per IP/user
5. **Service Routing**: Dynamic routing to appropriate backend service
6. **Request Enhancement**: Add user context headers for backend services
7. **Response Processing**: Forward response with correlation headers

## Error Handling

The gateway provides consistent error responses:

```json
{
  "error": "Human readable error message",
  "code": "MACHINE_READABLE_CODE",
  "requestId": "gw-1234567890-abc123"
}
```

Common error codes:
- `MISSING_TOKEN` - No authorization header provided
- `INVALID_TOKEN` - JWT token is invalid or malformed
- `TOKEN_EXPIRED` - JWT token has expired
- `INSUFFICIENT_PERMISSIONS` - User lacks required role
- `SERVICE_UNAVAILABLE` - Backend service is down
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Monitoring

### Health Checks
- Gateway exposes health endpoints for monitoring
- Individual service health is checked and cached
- Kubernetes-compatible readiness and liveness probes

### Logging
- Structured JSON logging in production
- Request correlation with X-Request-ID
- User and tenant context in logs
- Performance metrics per request

### Metrics
- Request count and response times
- Error rates by service and endpoint
- Rate limiting statistics
- Service health status

## Security Considerations

- JWT secrets should be rotated regularly
- CORS origins should be restricted in production
- Rate limits should be tuned based on usage patterns
- All backend services should validate gateway headers
- Use HTTPS in production environments

## Deployment

The gateway service is designed to be deployed as a containerized application with:
- Horizontal scaling support
- Health check endpoints for load balancers
- Graceful shutdown handling
- Environment-based configuration
