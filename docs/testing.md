# Testing Helpers

The package ships with utilities that streamline integration testing for decorated controllers without repeating the full bootstrap logic.

## `createDecoratedTestApp`

```typescript
import request from "supertest";
import {
  createDecoratedTestApp,
  Controller,
  Post,
  Body,
  Param,
} from "@abejarano/ts-express-server";

@Controller("/users")
class UsersController {
  @Post(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return { id, ...body };
  }
}

it("updates a user", async () => {
  const { app, stop } = await createDecoratedTestApp({
    controllers: [UsersController],
  });

  const response = await request(app)
    .post("/users/42")
    .send({ name: "Eve" })
    .set("Content-Type", "application/json");

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ id: "42", name: "Eve" });

  await stop();
});
```

### Options

| Option              | Type                                 | Description                                                               |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `controllers`       | `Array<new (...args: any[]) => any>` | Controller classes to register.                                           |
| `controllersModule` | `ControllersModule`                  | Provide an existing module instead of letting the helper create one.      |
| `port`              | `number`                             | Port used when initializing (defaults to `0`).                            |
| `services`          | `BaseServerService[]`                | Services to preload for tests.                                            |
| `standardOptions`   | `BootstrapStandardServerOptions`     | Fine-tune the preset modules (same pattern as `BootstrapStandardServer`). |

The helper disables `CorsModule`, `SecurityModule`, and `RateLimitModule` by default to keep tests focused. You can re-enable or replace them through `standardOptions.modules`.

> `stop()` will close the underlying HTTP server if it was started, but it does not invoke `gracefulShutdown` to avoid terminating the test process.
