# Examples

## Real-world Project Structure

In a real project, you should separate your routes, controllers, and services into different files.

### 1. Define your Routes (Legacy/Router approach)

`src/infrastructure/http/routes/index.ts`

```typescript
import { RoutesModule } from "@abejarano/ts-express-server";
import { Router } from "express";

// Import your sub-routers
import churchRouters from "./Church.routers";
import memberRouters from "./Member.routers";
import financialRouter from "./Financial.routers";

export const AppRoutes = () =>
  new RoutesModule([
    { path: "/api/v1/church", router: churchRouters },
    { path: "/api/v1/church/member", router: memberRouters },
    { path: "/api/v1/finance", router: financialRouter },
  ]);
```

### 2. Define your Controllers (Decorator approach)

`src/infrastructure/http/controllers/index.ts`

```typescript
import { ControllersModule } from "@abejarano/ts-express-server";
import { ReportFinanceController } from "./ReportFinanceController";
import { UserController } from "./UserController";

export const AppControllers = () =>
  new ControllersModule([ReportFinanceController, UserController]);
```

### 3. Define your Services

`src/infrastructure/services/index.ts`

```typescript
import { BaseServerService } from "@abejarano/ts-express-server";

export class DatabaseService extends BaseServerService {
  name = "Database";
  async start() {
    /* Connect to DB */
  }
  async stop() {
    /* Disconnect DB */
  }
}

export class SocketService extends BaseServerService {
  name = "Socket";
  async start() {
    /* Start Socket.io */
  }
}
```

### 4. Entrypoint

`src/index.ts`

```typescript
import { BootstrapStandardServer } from "@abejarano/ts-express-server";
import { AppRoutes } from "./infrastructure/http/routes";
import { AppControllers } from "./infrastructure/http/controllers";
import { DatabaseService, SocketService } from "./infrastructure/services";

// Initialize Server
const server = BootstrapStandardServer(
  Number(process.env.APP_PORT || 8080),
  AppRoutes(), // Legacy Routes
  AppControllers(), // Decorated Controllers
);

// Add Background Services
server.addServices([new DatabaseService(), new SocketService()]);

// Start Server
server.start().then(() => {
  console.log("🚀 Server is running!");
});
```

## Complete Monolithic Example (Simple)

```typescript
import {
  BootstrapStandardServer,
  RoutesModule,
  BaseServerService,
} from "@abejarano/ts-express-server";
import { Router } from "express";

// ... (rest of the simple example)
```
