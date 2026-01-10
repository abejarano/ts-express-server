import { BootstrapStandardServer } from "../BootstrapStandardServer";
import type { BootstrapServer } from "../BootstrapServer";
import { ControllersModule } from "../modules";
import { BaseServerService, ServerApp, ServerRuntime } from "../abstract";
import { BootstrapStandardServerOptions } from "../BootstrapStandardServer";

type ControllerClass<T = any> = new (...args: any[]) => T;

export interface DecoratedTestAppOptions {
  controllers?: ControllerClass[];
  controllersModule?: ControllersModule;
  port?: number;
  services?: BaseServerService[];
  standardOptions?: BootstrapStandardServerOptions;
  runtime?: ServerRuntime;
}

export interface DecoratedTestAppResult {
  app: ServerApp;
  server: BootstrapServer;
  stop: () => Promise<void>;
}

const mergeOptions = (
  base: BootstrapStandardServerOptions,
  override?: BootstrapStandardServerOptions
): BootstrapStandardServerOptions => {
  if (!override) {
    return base;
  }

  const mergedServices = [
    ...(base.services ?? []),
    ...(override.services ?? []),
  ];

  return {
    runtime: override.runtime ?? base.runtime,
    services: mergedServices.length ? mergedServices : undefined,
    modules: {
      ...(base.modules ?? {}),
      ...(override.modules ?? {}),
    },
  };
};

export async function createDecoratedTestApp(
  options: DecoratedTestAppOptions
): Promise<DecoratedTestAppResult> {
  const {
    controllers = [],
    controllersModule,
    port = 0,
    services,
    standardOptions,
  } = options;

  const moduleInstance =
    controllersModule ?? new ControllersModule(controllers);

  const baseOptions: BootstrapStandardServerOptions = {
    services,
    modules: {
      cors: false,
      security: false,
      rateLimit: false,
    },
  };

  const mergedOptions = mergeOptions(baseOptions, standardOptions);

  const server = BootstrapStandardServer(port, moduleInstance, {
    ...mergedOptions,
    runtime: options.runtime ?? mergedOptions.runtime,
  });

  await server.initialize();

  return {
    app: server.getApp(),
    server,
    stop: async () => {
      const serverInstance = server.getServer();
      if (serverInstance) {
        await new Promise<void>((resolve) =>
          serverInstance.close(() => resolve())
        );
      }
    },
  };
}
