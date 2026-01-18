import { BunKitStandardServer } from "../BunKitStandardServer";
import type { BunKitServer } from "../BunKitServer";
import { ControllersModule } from "../modules";
import { BaseServerService, ServerApp } from "../abstract";
import { BunKitStandardServerOptions } from "../BunKitStandardServer";

type ControllerClass<T = any> = new (...args: any[]) => T;

export interface DecoratedTestAppOptions {
  controllers?: ControllerClass[];
  controllersModule?: ControllersModule;
  port?: number;
  services?: BaseServerService[];
  standardOptions?: BunKitStandardServerOptions;
}

export interface DecoratedTestAppResult {
  app: ServerApp;
  server: BunKitServer;
  stop: () => Promise<void>;
}

const mergeOptions = (
  base: BunKitStandardServerOptions,
  override?: BunKitStandardServerOptions
): BunKitStandardServerOptions => {
  if (!override) {
    return base;
  }

  const mergedServices = [
    ...(base.services ?? []),
    ...(override.services ?? []),
  ];

  return {
    adapter: override.adapter ?? base.adapter,
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

  const baseOptions: BunKitStandardServerOptions = {
    services,
    modules: {
      cors: false,
      security: false,
      rateLimit: false,
    },
  };

  const mergedOptions = mergeOptions(baseOptions, standardOptions);

  const server = BunKitStandardServer(port, moduleInstance, {
    ...mergedOptions,
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
