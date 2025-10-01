import { BootstrapServer } from "./BootstrapServer";
import {
  CorsModule,
  FileUploadModule,
  RateLimitModule,
  RequestContextModule,
  RoutesModule,
  SecurityModule,
} from "./modules";
import { ServiceModule } from "./abstract";

export const BootstrapStandardServer = (
  port: number,
  routes: RoutesModule,
  services?: ServiceModule[],
): BootstrapServer => {
  const expressServer = new BootstrapServer(port).addModules([
    routes,
    new CorsModule(),
    new SecurityModule(),
    new RateLimitModule(),
    new FileUploadModule(),
    new RequestContextModule(),
  ]);

  if (services) {
    expressServer.addServices(services);
  }

  expressServer.start();

  return expressServer;
};
