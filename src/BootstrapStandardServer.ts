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
  routes: RoutesModule,
  services?: BaseServerService[]
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  controllersModule?: ControllersModule,
  services?: BaseServerService[]
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  arg3?: BaseServerService[] | ControllersModule,
  arg4?: BaseServerService[]
): BootstrapServer {
  const expressServer = new BootstrapServer(port).addModules([
    routes,
    new CorsModule(),
    new SecurityModule(),
    new RateLimitModule(),
    new FileUploadModule(),
    new RequestContextModule(),
  ]);

  let controllersModule: ControllersModule | undefined;
  let services: BaseServerService[] | undefined;

  if (Array.isArray(arg3)) {
    services = arg3;
  } else {
    if (arg3 instanceof ControllersModule) {
      controllersModule = arg3;
    }
    if (Array.isArray(arg4)) {
      services = arg4;
    }
  }

  if (controllersModule) {
    expressServer.addModule(controllersModule);
  }

  if (services) {
    expressServer.addServices(services);
  }

  return expressServer;
}
