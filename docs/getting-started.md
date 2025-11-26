# Getting Started

## Quick Start

### Basic Server Setup

```typescript
import { BootstrapServer, RoutesModule } from "@abejarano/ts-express-server";
import { Router } from "express";

// Create a simple route
const apiRouter = Router();
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Configure routes module
const routesModule = new RoutesModule([{ path: "/api", router: apiRouter }]);

// Create and start server
const server = new BootstrapServer(3000).addModule(routesModule);

server.start().then(() => {
  console.log("Server is running on http://localhost:3000");
});
```

### Using the Standard Server (Recommended)

For most applications, use `BootstrapStandardServer` which includes common modules:

```typescript
import {
  BootstrapStandardServer,
  RoutesModule,
} from "@abejarano/ts-express-server";
import { Router } from "express";

const apiRouter = Router();
apiRouter.get("/users", (req, res) => {
  res.json({ users: [] });
});

const routesModule = new RoutesModule([{ path: "/api", router: apiRouter }]);

const server = BootstrapStandardServer(3000, routesModule);

server.start();
```

The standard server includes:

- **CorsModule**: Cross-Origin Resource Sharing configuration
- **SecurityModule**: Security headers via Helmet
- **RateLimitModule**: Rate limiting protection
- **FileUploadModule**: File upload handling
- **RequestContextModule**: Request context and correlation IDs
- **RoutesModule**: Manages application routes
- **ControllersModule**: Manages decorated controllers

## Environment Configuration

```typescript
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/myapp";

const services = [new MongoDBService(mongoUri)];

// Option 1: Legacy Routes + Services
const server1 = BootstrapStandardServer(port, routesModule, services);

// Option 2: Decorated Controllers + Services
const server2 = BootstrapStandardServer(port, controllersModule, services);

// Option 3: Both + Services
const server3 = BootstrapStandardServer(
  port,
  routesModule,
  controllersModule,
  services,
);
```
