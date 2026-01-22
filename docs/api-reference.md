# API Reference

Reference for the platform primitives, defaults, and extension points.

## BunKitStandardServer

A helper function to quickly bootstrap a standard server with common modules.

### Signatures

```typescript
interface BunKitStandardServerOptions {
  adapter?: ServerAdapter;
  modules?: {
    cors?: BaseServerModule | false;
    security?: BaseServerModule | false;
    rateLimit?: BaseServerModule | false;
    fileUpload?: BaseServerModule | false;
    requestContext?: BaseServerModule | false;
    extra?: BaseServerModule[];
  };
  services?: BaseServerService[];
}

// Controllers with optional services/options
function BunKitStandardServer(
  port: number,
  module: ControllersModule,
  servicesOrOptions?: BaseServerService[] | BunKitStandardServerOptions,
  maybeOptions?: BunKitStandardServerOptions
): BunKitServer;
```

When you only need to tweak modules, you can skip the services array and pass the options object directly as the next argument.

## BunKitServer Methods

- `addModule(module: BaseServerModule)`: Add a single module
- `addModules(modules: BaseServerModule[])`: Add multiple modules
- `addService(service: BaseServerService)`: Add a single service
- `addServices(services: BaseServerService[])`: Add multiple services
- `getApp()`: Get the server application instance
- `getServer()`: Get the underlying server instance
- `getModule<T>(moduleClass)`: Get a specific module instance
- `hasModule(moduleClass)`: Check if a module is registered
- `start()`: Start the server
- `gracefulShutdown()`: Perform graceful shutdown

## Bun Runtime Configuration

Uploads are only enabled when `FileUploadModule` is registered. Configure multipart limits and MIME allowlists through the module.

```typescript
import { FileUploadModule } from "bun-platform-kit";

new FileUploadModule({
  maxBodyBytes: 20 * 1024 * 1024,
  maxFileBytes: 5 * 1024 * 1024,
  maxFiles: 3,
  allowedMimeTypes: ["image/*", "application/pdf"],
});
```

Other Bun settings:

```typescript
app.set("trustProxy", ["127.0.0.1/8"]); // CIDR allowlist for proxies
// app.set("trustProxy", (ip) => ip === "127.0.0.1"); // custom trust function
app.set("handlerTimeoutMs", 30_000); // 0/undefined disables
```

Defaults (Bun):
- `maxBodyBytes`: 10 MB
- `maxFileBytes`: 10 MB
- `maxFiles`: 10
- `allowedMimeTypes`: allow all

Cookies:
- `req.cookies` is parsed from the incoming `cookie` header.
- `res.cookie(name, value, options)` sets cookies; `maxAge` is milliseconds. `sameSite: "none"` forces `secure: true`.
- When using Bun CookieMap, `maxAge` is converted to seconds before setting (Bun expects seconds).

Handler timeouts (Bun):
- `handlerTimeoutMs` triggers a 504 response if middleware never calls `next()` or ends the response.

Multipart note (Bun):
- `request.formData()` is not streaming in Bun; payloads are fully buffered before parsing. This is fine for small/medium uploads but risky for large files or hostile traffic.
- For large uploads, prefer direct-to-object-storage flows (S3/R2/MinIO) with signed URLs; keep the backend for signing and metadata validation.

Uploads shape (Bun):
- `req.files` is `Record<string, File | File[]>` (single or array per field).
- Use `getFile(req, "field")` for single uploads and `getFiles(req, "field")` for multiple.

Response note (Bun):
- If you `res.send(new Response(...))`, do not read/consume the Response body before sending; streamed bodies cannot be reused.

## BaseServerModule Properties

- `priority: number`: Initialization priority (default: 0)
- `getModuleName(): string`: Module identifier
- `init(app: ServerApp, context: ServerContext)`: Module initialization method
- `shutdown()`: Optional cleanup method

## BaseServerService Properties

- `name: string`: Service identifier
- `start(server: ServerInstance)`: Service startup method
- `stop()`: Optional cleanup method

## Testing Helpers

### `createDecoratedTestApp(options)`

Creates an initialized `BunKitServer` configured with the provided decorated controllers, returning the app and a `stop` helper for cleanup.

```typescript
type DecoratedTestAppOptions = {
  controllers?: Array<new (...args: any[]) => any>;
  controllersModule?: ControllersModule;
  port?: number;
  services?: BaseServerService[];
  standardOptions?: BunKitStandardServerOptions;
};

type DecoratedTestAppResult = {
  app: ServerApp;
  server: BunKitServer;
  stop: () => Promise<void>;
};
```

The helper disables `CorsModule`, `SecurityModule`, and `RateLimitModule` by default. Use `standardOptions.modules` to re-enable or replace them for specific scenarios.
