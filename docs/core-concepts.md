# Core Concepts

## ServerModule

**ServerModules** are components that configure and enhance the Express.js application during startup. They handle middleware setup, route registration, and other Express-specific configurations.

Key characteristics:

- Extend `BaseServerModule`
- Initialize during server startup via the `init()` method
- Support priority-based initialization order
- Can implement graceful shutdown logic
- Examples: CORS setup, security headers, route registration, rate limiting

## ServerService

**ServerServices** are background services that start when the HTTP server is ready. They handle long-running tasks, external connections, and background processes.

Key characteristics:

- Extend `BaseServerService`
- Start after the HTTP server is listening via the `start()` method
- Receive the HTTP server instance for advanced integrations
- Support graceful shutdown via the `stop()` method
- Examples: Database connections, WebSocket servers, background job processors

## Module Priority System

Modules are initialized in priority order (lower numbers = higher priority):

```typescript
// System modules (negative priorities)
CorsModule: -90;
SecurityModule: -80;
RateLimitModule: -70;
// ... other system modules

// Application modules (positive priorities)
RoutesModule: 10;
// ... your custom modules
```
