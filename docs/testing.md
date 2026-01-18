# Testing Helpers

Testing helpers keep your bootstrapping consistent so you can focus on behavior, not wiring.

The package ships with utilities that streamline integration testing for decorated controllers without repeating the full bootstrap logic.

## `createDecoratedTestApp`

```typescript
import {
  createDecoratedTestApp,
  Controller,
  Post,
  Body,
  Param,
} from "bun-platform-kit";

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

  const handler = (app as any).createFetchHandler();
  const response = await handler(
    new Request("http://localhost/users/42", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Eve" }),
    }),
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ id: "42", name: "Eve" });

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
| `standardOptions`   | `BunKitStandardServerOptions`     | Fine-tune the preset modules (same pattern as `BunKitStandardServer`). |

The helper disables `CorsModule`, `SecurityModule`, and `RateLimitModule` by default to keep tests focused. You can re-enable or replace them through `standardOptions.modules`.

> `stop()` will close the underlying HTTP server if it was started, but it does not invoke `gracefulShutdown` to avoid terminating the test process.
