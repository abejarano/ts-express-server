# Core Concepts

These primitives keep teams aligned: modules handle app wiring, services run background work, and priorities make startup deterministic.

## ServerModule

**ServerModules** are components that configure and enhance the server application during startup. They handle middleware setup, route registration, and other runtime-specific configurations.

Key characteristics:

- Extend `BaseServerModule`
- Initialize during server startup via the `init()` method
- Support priority-based initialization order
- Can implement graceful shutdown logic
- Examples: CORS setup, security headers, route registration, rate limiting

## ServerService

**ServerServices** are background services that start when the server is ready. They handle long-running tasks, external connections, and background processes.

Key characteristics:

- Extend `BaseServerService`
- Start after the server is listening via the `start()` method
- Receive the server instance for advanced integrations
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
ControllersModule: 10;
// ... your custom modules
```
