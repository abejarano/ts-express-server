import { Express, Router } from "express";
import { BaseServerModule } from "../abstract/ServerModule";

export interface RouteConfig {
  path: string;
  router: Router;
}

export class RoutesModule extends BaseServerModule {
  name = "Routes";
  priority = 10; // Se ejecuta después de los middlewares básicos

  private routes: RouteConfig[];

  constructor(routes: RouteConfig[] = []) {
    super();
    this.routes = routes;
  }

  addRoute(path: string, router: Router): void {
    this.routes.push({ path, router });
  }

  addRoutes(routes: RouteConfig[]): void {
    this.routes.push(...routes);
  }

  init(app: Express): void {
    this.routes.forEach(({ path, router }) => {
      app.use(path, router);
    });
  }
}
