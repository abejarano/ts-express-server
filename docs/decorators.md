# Using Decorators

You can define your routes using decorators for a cleaner and more declarative approach.

## 1. Create a Controller

```typescript
import { Request, Response } from "express";
import {
  Controller,
  Get,
  Post,
  Use,
} from "@abejarano/ts-express-server/decorators";

// Example middleware
const AuthMiddleware = (req: any, res: any, next: any) => next();

@Controller("/users")
export class UserController {
  @Get("/")
  async getUsers(req: Request, res: Response) {
    res.json({ users: [] });
  }

  @Post("/")
  @Use(AuthMiddleware)
  async createUser(req: Request, res: Response) {
    res.json({ message: "User created" });
  }
}
```

## 2. Register the Controller

```typescript
import {
  BootstrapStandardServer,
  ControllersModule,
  RoutesModule,
} from "@abejarano/ts-express-server";
import { UserController } from "./controllers/UserController";

// Legacy routes (optional)
const routesModule = new RoutesModule([]);

// New decorated controllers
const controllersModule = new ControllersModule([UserController]);

const server = BootstrapStandardServer(3000, routesModule, controllersModule);

server.start();
```
