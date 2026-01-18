# Modules

Modules are the extension points of the platform: add cross-cutting concerns without touching your controllers.

This page documents only the modules that are implemented in `src/modules`.

## Built-in Modules

- **CorsModule**: Configures Cross-Origin Resource Sharing.
- **SecurityModule**: Adds security headers (Helmet-style options).
- **RateLimitModule**: Implements in-memory rate limiting.
- **FileUploadModule**: Enables multipart uploads and enforces upload limits.
- **RequestContextModule**: Adds request correlation IDs and async context.
- **ControllersModule**: Wires decorated controllers into a router.

You can opt-out of any of these when using `BunKitStandardServer` by passing configuration options, or replace them with your own implementations while still benefiting from the preset wiring.

## CorsModule

`CorsModule` accepts `CorsOptions` (from the `cors` types) and uses a small built-in middleware. Defaults are permissive for local development.

Defaults:

- `origin: "*"`
- `allowedHeaders: ["content-type"]`
- `methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"]`
- `preflightContinue: false`
- `optionsSuccessStatus: 204`

Example:

```typescript
import { CorsModule } from "bun-platform-kit";

const cors = new CorsModule({
  origin: ["https://example.com"],
  allowedHeaders: ["content-type", "authorization"],
  credentials: true,
});
```

## SecurityModule

`SecurityModule` accepts `HelmetOptions` and maps a subset of them to response headers.

Applied options:

- `frameguard`
- `ieNoOpen`
- `noSniff`
- `originAgentCluster`
- `permittedCrossDomainPolicies`
- `referrerPolicy`
- `dnsPrefetchControl`

Defaults (key highlights):

- `frameguard: { action: "deny" }`
- `ieNoOpen: true`
- `noSniff: true`
- `originAgentCluster: true`
- `permittedCrossDomainPolicies: false`
- `referrerPolicy: { policy: "no-referrer" }`
- `dnsPrefetchControl: true`
Note: other `HelmetOptions` are accepted but not applied by the built-in middleware.

Example:

```typescript
import { SecurityModule } from "bun-platform-kit";

const security = new SecurityModule({
  frameguard: { action: "sameorigin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});
```

## RateLimitModule

`RateLimitModule` uses an in-memory counter by IP (or `x-forwarded-for`) with a fixed window.

Options:

- `windowMs` (default `8 * 60 * 1000`)
- `limit` (default `100`)
- `max` (legacy alias for `limit`)
- `standardHeaders` (default `true`)
- `legacyHeaders` (defined but not used by the built-in middleware)
- `message` (string or object for 429 response)

Example:

```typescript
import { RateLimitModule } from "bun-platform-kit";

const rateLimit = new RateLimitModule({
  windowMs: 60_000,
  limit: 30,
  message: { message: "Too many requests" },
});
```

## FileUploadModule

File uploads are disabled unless `FileUploadModule` is registered. It enables multipart handling by setting `fileUploadEnabled` and `multipart` options on the app.

Options:

- `maxBodyBytes`
- `maxFileBytes`
- `maxFiles`
- `maxFields`
- `maxFieldBytes`
- `maxFieldsBytes`
- `allowedMimeTypes`
- `allowedFileSignatures` (`"png" | "jpg" | "jpeg" | "pdf" | "csv"`)
- `validateFile` (custom validator)

Example:

```typescript
import { FileUploadModule } from "bun-platform-kit";

const fileUpload = new FileUploadModule({
  maxBodyBytes: 10 * 1024 * 1024,
  maxFileBytes: 10 * 1024 * 1024,
  maxFiles: 10,
  allowedMimeTypes: ["image/*", "application/pdf"],
});
```

## RequestContextModule

`RequestContextModule` assigns a `requestId` to each request and stores it in `AsyncLocalStorage` for later access.

Behavior:

- Uses `x-request-id` header if present.
- Generates a UUID (or a timestamp fallback) otherwise.
- Exports `RequestContext.requestId` for access within the request scope.

## ControllersModule

`ControllersModule` wires decorated controllers into a router. It requires an array of controller classes and respects class and route metadata (base path, middlewares, parameters).

Example:

```typescript
import { ControllersModule } from "bun-platform-kit";
import { UserController } from "./controllers/UserController";

const controllers = new ControllersModule([UserController]);
```
