import { BootstrapServer } from "./BootstrapServer";
import {
  CorsModule,
  ControllersModule,
  FileUploadModule,
  RateLimitModule,
  RequestContextModule,
  RoutesModule,
  SecurityModule,
} from "./modules";
import { BaseServerService } from "./abstract";

export function BootstrapStandardServer(
  port: number,
  module: RoutesModule | ControllersModule,
  services?: BaseServerService[]
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  controllersModule: ControllersModule,
  services?: BaseServerService[]
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  arg2: RoutesModule | ControllersModule,
  arg3?: BaseServerService[] | ControllersModule,
  arg4?: BaseServerService[]
): BootstrapServer {
  let routesModule: RoutesModule;
  let controllersModule: ControllersModule | undefined;
  let services: BaseServerService[] | undefined;

  if (arg2 instanceof RoutesModule) {
    routesModule = arg2;
    if (arg3 instanceof ControllersModule) {
      controllersModule = arg3;
      services = arg4;
    } else if (Array.isArray(arg3)) {
      services = arg3;
    }
  } else if (arg2 instanceof ControllersModule) {
    controllersModule = arg2;
    routesModule = new RoutesModule();
    if (Array.isArray(arg3)) {
      services = arg3;
    }
  } else {
    throw new Error(
      "Invalid second argument. Must be RoutesModule or ControllersModule"
    );
  }

  const expressServer = new BootstrapServer(port).addModules([
    routesModule,
    new CorsModule(),
    new SecurityModule(),
    new RateLimitModule(),
    new FileUploadModule(),
    new RequestContextModule(),
  ]);

  if (controllersModule) {
    expressServer.addModule(controllersModule);
  }

  if (services) {
    expressServer.addServices(services);
  }

  return expressServer;
}
