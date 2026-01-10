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
