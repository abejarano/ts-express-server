import { Express, RequestHandler, Router } from "express";
import { BaseServerModule } from "../abstract";

export interface RouteConfig {
  path: string;
  router: Router;
  middleware?: RequestHandler[] | RequestHandler;
}

export class RoutesModule extends BaseServerModule {
  name = "Routes";
  priority = 10; // Se ejecuta después de los middlewares básicos

  private routes: RouteConfig[];

  constructor(routes: RouteConfig[] = []) {
    super();
    this.routes = routes;
  }

  addRoute(route: RouteConfig): void {
    this.routes.push({
      ...route,
    });
  }

  addRoutes(routes: RouteConfig[]): void {
    this.routes.push(...routes);
  }

  init(app: Express): void {
    this.routes.forEach(({ path, router, middleware }) => {
      if (middleware && middleware.length > 0) {
        app.use(path, middleware, router);
      } else {
        app.use(path, router);
      }
    });
  }
}
