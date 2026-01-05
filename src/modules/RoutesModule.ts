import { BaseServerModule } from "../abstract";
import { ServerApp, ServerContext, ServerHandler, ServerRouter } from "../abstract";

export interface RouteConfig {
  path: string;
  router: ServerRouter;
  middleware?: ServerHandler[] | ServerHandler;
}

export class RoutesModule extends BaseServerModule {
  name = "Routes";
  priority = 10; // Executed after basic middlewares

  private routes: RouteConfig[];

  constructor(routes: RouteConfig[] = []) {
    super();
    this.routes = routes;
  }

  getModuleName(): string {
    return this.name;
  }

  addRoute(route: RouteConfig): void {
    this.routes.push({
      ...route,
    });
  }

  addRoutes(routes: RouteConfig[]): void {
    this.routes.push(...routes);
  }

  init(app: ServerApp, _context?: ServerContext): void {
    this.routes.forEach(({ path, router, middleware }) => {
      const middlewareList = Array.isArray(middleware)
        ? middleware
        : middleware
          ? [middleware]
          : [];

      if (middlewareList.length > 0) {
        app.use(path, ...middlewareList, router);
      } else {
        app.use(path, router);
      }
    });
  }
}
