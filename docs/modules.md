# Modules

## Built-in Modules

- **CorsModule**: Configures Cross-Origin Resource Sharing
- **SecurityModule**: Adds security headers using Helmet
- **RateLimitModule**: Implements rate limiting
- **FileUploadModule**: Handles file uploads
- **RequestContextModule**: Adds request correlation IDs
- **RoutesModule**: Manages application routes (Express only; use decorators on Bun)
- **ControllersModule**: Manages decorated controllers

You can opt-out of any of these when using `BootstrapStandardServer` by passing configuration options, or replace them with your own implementations while still benefiting from the preset wiring.

## Creating Custom Modules

### Basic Module Example

```typescript
import {
  BaseServerModule,
  ServerApp,
  ServerContext,
} from "@abejarano/ts-express-server";

export class LoggingModule extends BaseServerModule {
  name = "Logging";
  priority = -100; // Higher priority (loads earlier)

  init(app: ServerApp, _context: ServerContext): void {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }
}
```

### Advanced Module with Configuration

```typescript
import {
  BaseServerModule,
  ServerApp,
  ServerContext,
} from "@abejarano/ts-express-server";
import compression from "compression";

export interface CompressionConfig {
  level: number;
  threshold: string;
}

export class CompressionModule extends BaseServerModule {
  name = "Compression";
  priority = -50;

  constructor(
    private config: CompressionConfig = { level: 6, threshold: "1kb" },
  ) {
    super();
  }

  init(app: ServerApp, _context: ServerContext): void {
    app.use(
      compression({
        level: this.config.level,
        threshold: this.config.threshold,
      }),
    );
  }

  async shutdown(): Promise<void> {
    console.log("Compression module shutdown");
  }
}
```
