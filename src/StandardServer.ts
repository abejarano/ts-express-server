import { ExpressServer } from "./ExpressServer";
import {
  CorsModule,
  FileUploadModule,
  RateLimitModule,
  RequestContextModule,
  RoutesModule,
  SecurityModule,
} from "./modules";
import { ServiceModule } from "./abstract/ServiceModule";

export const StandardServer = (
  port: number,
  routes: RoutesModule,
  services?: ServiceModule[],
): ExpressServer => {
  const expressServer = new ExpressServer(port).addModules([
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
