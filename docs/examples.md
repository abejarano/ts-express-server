# Examples

## Complete Example with Services

```typescript
import {
  BootstrapStandardServer,
  RoutesModule,
} from "@abejarano/ts-express-server";
import { Router } from "express";

// Custom services
class MongoDBService extends BaseServerService {
  name = "MongoDB";

  constructor(private connectionString: string) {
    super();
  }

  async start(): Promise<void> {
    // MongoDB connection logic
    console.log("MongoDB service started");
  }

  async stop(): Promise<void> {
    console.log("MongoDB service stopped");
  }
}

class RedisService extends BaseServerService {
  name = "Redis";

  async start(): Promise<void> {
    // Redis connection logic
    console.log("Redis service started");
  }

  async stop(): Promise<void> {
    console.log("Redis service stopped");
  }
}

// Routes
const apiRouter = Router();
apiRouter.get("/users", (req, res) => {
  res.json({ message: "Users endpoint" });
});

const routesModule = new RoutesModule([{ path: "/api/v1", router: apiRouter }]);

// Services
const services = [
  new MongoDBService("mongodb://localhost:27017/myapp"),
  new RedisService(),
];

// Create server
const server = BootstrapStandardServer(3000, routesModule, services);

// Start server
server.start().then(() => {
  console.log("🚀 Server running on http://localhost:3000");
});
```
