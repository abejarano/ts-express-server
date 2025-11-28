import { Express } from "express";
import { BootstrapStandardServer } from "../BootstrapStandardServer";
import type { BootstrapServer } from "../BootstrapServer";
import { ControllersModule } from "../modules";
import { BaseServerService } from "../abstract";
import { BootstrapStandardServerOptions } from "../BootstrapStandardServer";

type ControllerClass<T = any> = new (...args: any[]) => T;

export interface DecoratedTestAppOptions {
  controllers?: ControllerClass[];
  controllersModule?: ControllersModule;
  port?: number;
  services?: BaseServerService[];
  standardOptions?: BootstrapStandardServerOptions;
}

export interface DecoratedTestAppResult {
  app: Express;
  server: BootstrapServer;
  stop: () => Promise<void>;
}

const mergeOptions = (
  base: BootstrapStandardServerOptions,
  override?: BootstrapStandardServerOptions,
): BootstrapStandardServerOptions => {
  if (!override) {
    return base;
  }

  const mergedServices = [
    ...(base.services ?? []),
    ...(override.services ?? []),
  ];

  return {
    services: mergedServices.length ? mergedServices : undefined,
    modules: {
      ...(base.modules ?? {}),
      ...(override.modules ?? {}),
    },
  };
};

export async function createDecoratedTestApp(
  options: DecoratedTestAppOptions,
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

  const server = BootstrapStandardServer(port, moduleInstance, mergedOptions);

  await server.initialize();

  return {
    app: server.getApp(),
    server,
    stop: async () => {
      const httpServer = server.getHttpServer();
      if (httpServer) {
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      }
    },
  };
}
