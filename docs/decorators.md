# Using Decorators

You can define your routes using decorators for a cleaner and more declarative approach.

## 1. Create a Controller

```typescript
import {
  Controller,
  Get,
  Post,
  Use,
  ServerRequest,
  ServerResponse,
} from "@abejarano/ts-express-server";

// Example middleware
const AuthMiddleware = (req: any, res: any, next: any) => next();

@Controller("/users")
export class UserController {
  @Get("/")
  async getUsers(req: ServerRequest, res: ServerResponse) {
    res.json({ users: [] });
  }

  @Post("/")
  @Use(AuthMiddleware)
  async createUser(req: ServerRequest, res: ServerResponse) {
    res.json({ message: "User created" });
  }
}
```

## 2. Register the Controller

You can register controllers in two ways:

### Option A: Using only Controllers

```typescript
import {
  BootstrapStandardServer,
  ControllersModule,
} from "@abejarano/ts-express-server";
import { UserController } from "./controllers/UserController";

const controllersModule = new ControllersModule([UserController]);

// Pass controllersModule directly as the second argument
const server = BootstrapStandardServer(3000, controllersModule);

server.start();
```

## 3. Parameter Decorators

You can use parameter decorators to access common request/response objects without manually reading `req` and `res`.

```typescript
import {
  Controller,
  Post,
  Param,
  Body,
  Res,
  ServerResponse,
} from "@abejarano/ts-express-server";

@Controller("/users")
export class UserController {
  @Post("/:userId")
  async updateUser(
    @Param("userId") userId: string,
    @Body() body: UpdateUserDto,
    @Res() res: ServerResponse
  ) {
    res.json({ userId, ...body });
  }
}
```

Available parameter decorators:

- `@Body(property?)` – Access the request body or a specific property
- `@Param(name?)` – Access route params
- `@Query(name?)` – Access query params
- `@Headers(name?)` – Access request headers
- `@Req()` – Inject the request object
- `@Res()` – Inject the response object
- `@Next()` – Inject the `next` handler
- `@UploadedFile(name?)` – Access files processed by the upload module

Decorated parameters take precedence; any remaining parameters fallback to the standard `(req, res, next)` order for compatibility.

In Bun runtime, `@UploadedFile` returns a `File` from `FormData` instead of the `express-fileupload` shape.

## 4. End-to-End Example

The controller below demonstrates a common flow with lightweight validation, file upload handling, and a typed response using only decorators:

```typescript
import {
  Body,
  Controller,
  Post,
  Res,
  UploadedFile,
  ServerResponse,
} from "@abejarano/ts-express-server";

interface CreateReportDto {
  name: string;
  description?: string;
}

@Controller("/reports")
export class ReportController {
  @Post("/")
  async createReport(
    @Body() body: CreateReportDto,
    @UploadedFile("file") uploadedFile: unknown,
    @Res() res: ServerResponse
  ) {
    if (!uploadedFile) {
      res.status(400).json({ message: "Missing file" });
      return;
    }

    // Process the uploaded file and persist metadata as needed
    res.status(201).json({
      name: body.name,
      description: body.description,
      size: uploadedFile.size,
      mimeType: uploadedFile.mimetype,
    });
  }
}
```

Key takeaways from the example:

- `BootstrapStandardServer` ships with `FileUploadModule`, so file parsing is already wired up.
- `@UploadedFile("file")` expects the multipart field name exactly as sent by the client (for example `<input name="file" />`).
- DTOs and file typings depend on your contracts; reuse shared interfaces to keep your API types in sync.

## 5. Considerations

- Ensure `experimentalDecorators` and `emitDecoratorMetadata` are enabled in your `tsconfig.json`; `reflect-metadata` is imported once for you in `src/index.ts`.
- Controllers are instantiated once per class, so keep them stateless or manage internal state carefully.
- Values injected via `@Body`, `@Query`, `@Param`, and `@Headers` reflect the current `req` state; any middleware mutations run before decorators resolve.
- When you inject `@Res()` or `@Next()`, you are responsible for completing the response or calling `next()`.
- Strongly type your parameters (for example `@Body() body: CreateUserDto`) to maximize the benefits of TypeScript.

## 6. Mixing Legacy Routes and Controllers

```typescript
import {
  BootstrapStandardServer,
  ControllersModule,
  RoutesModule,
} from "@abejarano/ts-express-server";
import { UserController } from "./controllers/UserController";

// Legacy routes
const routesModule = new RoutesModule([
  /* ... */
]);

// New decorated controllers
const controllersModule = new ControllersModule([UserController]);

// Pass both modules
const server = BootstrapStandardServer(3000, routesModule, controllersModule);

server.start();
```
