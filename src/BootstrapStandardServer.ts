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

export const BootstrapStandardServer = (
  port: number,
  routes: RoutesModule,
  controllersModule?: ControllersModule,
  services?: BaseServerService[]
): BootstrapServer => {
  const expressServer = new BootstrapServer(port).addModules([
    routes,
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
};
