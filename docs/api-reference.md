# API Reference

## BootstrapStandardServer

A helper function to quickly bootstrap a standard server with common modules.

### Signatures

```typescript
// 1. Legacy Routes + Services
function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  services?: BaseServerService[]
): BootstrapServer;

// 2. Decorated Controllers + Services
function BootstrapStandardServer(
  port: number,
  controllersModule: ControllersModule,
  services?: BaseServerService[]
): BootstrapServer;

// 3. Both Routes and Controllers + Services
function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  controllersModule: ControllersModule,
  services?: BaseServerService[]
): BootstrapServer;
```

## BootstrapServer Methods

- `addModule(module: BaseServerModule)`: Add a single module
- `addModules(modules: BaseServerModule[])`: Add multiple modules
- `addService(service: BaseServerService)`: Add a single service
- `addServices(services: BaseServerService[])`: Add multiple services
- `getApp()`: Get the Express application instance
- `getModule<T>(moduleClass)`: Get a specific module instance
- `hasModule(moduleClass)`: Check if a module is registered
- `start()`: Start the server
- `gracefulShutdown()`: Perform graceful shutdown

## BaseServerModule Properties

- `name: string`: Module identifier
- `priority: number`: Initialization priority (default: 0)
- `init(app: Express)`: Module initialization method
- `shutdown()`: Optional cleanup method

## BaseServerService Properties

- `name: string`: Service identifier
- `start(http: HttpServer)`: Service startup method
- `stop()`: Optional cleanup method
