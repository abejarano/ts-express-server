# Examples

Practical layouts that scale from quick prototypes to production setups.

## Real-world Project Structure

In a real project, you should separate your controllers and services into different files.

### 1. Define your Controllers (Decorator approach)

`src/infrastructure/http/controllers/index.ts`

```typescript
import { ControllersModule } from "bun-platform-kit";
import { ReportFinanceController } from "./ReportFinanceController";
import { UserController } from "./UserController";

export const AppControllers = () =>
  new ControllersModule([ReportFinanceController, UserController]);
```

### 2. Define your Services

`src/infrastructure/services/index.ts`

```typescript
import { BaseServerService } from "bun-platform-kit";

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

### 3. Entrypoint

`src/index.ts`

```typescript
import { BunKitStandardServer } from "bun-platform-kit";
import { AppControllers } from "./infrastructure/http/controllers";
import { DatabaseService, SocketService } from "./infrastructure/services";

// Initialize Server
const server = BunKitStandardServer(
  Number(process.env.APP_PORT || 8080),
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
  BunKitStandardServer,
  ControllersModule,
  Controller,
  Get,
} from "bun-platform-kit";

@Controller("/api")
class HealthController {
  @Get("/health")
  health(_req: any, res: any) {
    res.json({ ok: true });
  }
}

const controllersModule = new ControllersModule([HealthController]);

const server = BunKitStandardServer(3000, controllersModule);

server.start();
```
