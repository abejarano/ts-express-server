# API Reference

## BootstrapStandardServer

A helper function to quickly bootstrap a standard server with common modules.

### Signatures

```typescript
interface BootstrapStandardServerOptions {
  runtime?: ServerRuntime | "bun" | "express";
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

// Routes or controllers with optional services/options
function BootstrapStandardServer(
  port: number,
  module: RoutesModule | ControllersModule,
  servicesOrOptions?: BaseServerService[] | BootstrapStandardServerOptions,
  maybeOptions?: BootstrapStandardServerOptions
): BootstrapServer;

// Routes + controllers with optional services/options
function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  controllersModule: ControllersModule,
  servicesOrOptions?: BaseServerService[] | BootstrapStandardServerOptions,
  maybeOptions?: BootstrapStandardServerOptions,
  finalOptions?: BootstrapStandardServerOptions
): BootstrapServer;
```

When you only need to tweak modules, you can skip the services array and pass the options object directly as the next argument.

> Note: Provide a single `ControllersModule` instance per bootstrap call. Supplying different instances through multiple arguments will throw an error.

## BootstrapServer Methods

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

When running with `ServerRuntime.Bun`, you can configure multipart limits and MIME allowlists via `app.set`.

```typescript
app.set("multipart", {
  maxBodyBytes: 20 * 1024 * 1024,
  maxFileBytes: 5 * 1024 * 1024,
  maxFiles: 3,
  allowedMimeTypes: ["image/*", "application/pdf"],
});
```

Other Bun settings:

```typescript
app.set("trustProxy", true); // prefer X-Forwarded-For/X-Real-IP
app.set("handlerTimeoutMs", 30_000); // 0/undefined disables
```

Defaults (Bun):
- `maxBodyBytes`: 10 MB
- `maxFileBytes`: 10 MB
- `maxFiles`: 10
- `allowedMimeTypes`: allow all

Cookies:
- `req.cookies` is parsed from the incoming `cookie` header.
- `res.cookie(name, value, options)` sets cookies; `maxAge` is milliseconds (Express-style). `sameSite: "none"` forces `secure: true`.
- When using Bun CookieMap, `maxAge` is converted to seconds before setting (Bun expects seconds).

Handler timeouts (Bun):
- `handlerTimeoutMs` triggers a 504 response if middleware never calls `next()` or ends the response.

Multipart note (Bun):
- `request.formData()` is not streaming in Bun; payloads are fully buffered before parsing. This is fine for small/medium uploads but risky for large files or hostile traffic.
- For large uploads, prefer direct-to-object-storage flows (S3/R2/MinIO) with signed URLs; keep the backend for signing and metadata validation.

Uploads shape (Bun):
- `req.files` is always `Record<string, File[]>` (array per field).
- Use `getFile(req, "field")` for single uploads and `getFiles(req, "field")` for multiple.

Response note (Bun):
- If you `res.send(new Response(...))`, do not read/consume the Response body before sending; streamed bodies cannot be reused.

## BaseServerModule Properties

- `name: string`: Module identifier
- `priority: number`: Initialization priority (default: 0)
- `init(app: ServerApp, context: ServerContext)`: Module initialization method
- `shutdown()`: Optional cleanup method

## BaseServerService Properties

- `name: string`: Service identifier
- `start(server: ServerInstance)`: Service startup method
- `stop()`: Optional cleanup method

## Testing Helpers

### `createDecoratedTestApp(options)`

Creates an initialized `BootstrapServer` configured with the provided decorated controllers, returning the app and a `stop` helper for cleanup.

```typescript
type DecoratedTestAppOptions = {
  controllers?: Array<new (...args: any[]) => any>;
  controllersModule?: ControllersModule;
  port?: number;
  services?: BaseServerService[];
  standardOptions?: BootstrapStandardServerOptions;
  runtime?: ServerRuntime | "bun" | "express";
};

type DecoratedTestAppResult = {
  app: ServerApp;
  server: BootstrapServer;
  stop: () => Promise<void>;
};
```

The helper disables `CorsModule`, `SecurityModule`, and `RateLimitModule` by default. Use `standardOptions.modules` to re-enable or replace them for specific scenarios.
