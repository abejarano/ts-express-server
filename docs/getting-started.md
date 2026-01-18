# Getting Started

Start with the standard preset for a dev-friendly setup, then swap or extend modules as you grow. The goal is quick onboarding with enterprise-grade defaults.

## Quick Start

### Basic Server Setup

```typescript
import {
  BunKitServer,
  ControllersModule,
  Controller,
  Get,
} from "bun-platform-kit";

@Controller("/api")
class HealthController {
  @Get("/health")
  health(_req: any, res: any) {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  }
}

const controllersModule = new ControllersModule([HealthController]);

// Create and start server
const server = new BunKitServer(3000).addModule(controllersModule);

server.start().then(() => {
  console.log("Server is running on http://localhost:3000");
});
```

### Using the Standard Server (Recommended)

For most applications, use `BunKitStandardServer` which includes common modules:

```typescript
import {
  BunKitStandardServer,
  ControllersModule,
  Controller,
  Get,
} from "bun-platform-kit";

@Controller("/api")
class UsersController {
  @Get("/users")
  list(_req: any, res: any) {
    res.json({ users: [] });
  }
}

const controllersModule = new ControllersModule([UsersController]);

const server = BunKitStandardServer(3000, controllersModule);

server.start();
```

The standard server includes:

- **CorsModule**: Cross-Origin Resource Sharing configuration
- **SecurityModule**: Security headers via Helmet
- **RateLimitModule**: Rate limiting protection
- **FileUploadModule**: File upload handling
- **RequestContextModule**: Request context and correlation IDs
- **ControllersModule**: Manages decorated controllers

### Customizing the preset modules

`BunKitStandardServer` accepts an optional configuration object so you can tweak the bundled modules without dropping down to the low-level API:

```typescript
import {
  BunKitStandardServer,
  ControllersModule,
  RateLimitModule,
} from "bun-platform-kit";

const controllers = new ControllersModule([UserController]);

const server = BunKitStandardServer(3000, controllers, {
  modules: {
    rateLimit: new RateLimitModule({ windowMs: 30_000, max: 200 }),
    fileUpload: false, // disable built-in file uploads
    extra: [new LoggingModule()],
  },
  services: [new MetricsService()],
});

const serverWithCustomCors = BunKitStandardServer(
  Number(process.env.PORT ?? 8080),
  routesModule(),
  {
    modules: {
      cors: new CustomCorsModule(),
      extra: [new EnvironmentModule()],
    },
  }
);
```

You can replace any default module by providing an instance, disable it with `false`, or register additional modules through the `extra` array. Services can still be supplied via the array argument or the `services` property shown above.

## Environment Configuration

```typescript
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/myapp";

const services = [new MongoDBService(mongoUri)];

// Option 1: Legacy Routes + Services
const server1 = BunKitStandardServer(port, routesModule, services);

// Option 2: Decorated Controllers + Services
const server2 = BunKitStandardServer(port, controllersModule, services);

// Option 3: Both + Services
const server3 = BunKitStandardServer(
  port,
  routesModule,
  controllersModule,
  services
);
```

### Testing decorated controllers

When writing integration tests you can avoid repeating the bootstrap logic by using `createDecoratedTestApp` from the testing helpers. This utility wires up the controllers, disables non-essential modules, and gives you back an app instance ready for `supertest`.
