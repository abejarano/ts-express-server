import { Express, Router } from "express";
import { BaseServerModule } from "../abstract";
import { MetadataKeys } from "../decorators/MetadataKeys";
import { IRouter } from "../decorators/Handlers";
import "reflect-metadata";

export class ControllersModule extends BaseServerModule {
  name = "Controllers";
  priority = 10;

  constructor(private controllers: Function[]) {
    super();
  }

  getModuleName(): string {
    return this.name;
  }

  init(app: Express): void {
    this.controllers.forEach((ControllerClass) => {
      const basePath: string = Reflect.getMetadata(
        MetadataKeys.BASE_PATH,
        ControllerClass,
      );
      const classMiddlewares =
        Reflect.getMetadata(MetadataKeys.MIDDLEWARE, ControllerClass) || [];
      const routers: IRouter[] =
        Reflect.getMetadata(MetadataKeys.ROUTERS, ControllerClass.prototype) ||
        [];

      if (!basePath) {
        return;
      }

      const router = Router();

      // Create a single controller instance per controller class (singleton pattern)
      const controllerInstance = new (ControllerClass as any)();

      // Apply class-level middlewares
      if (classMiddlewares.length > 0) {
        router.use(classMiddlewares);
      }

      routers.forEach(({ method, path, handlerName }) => {
        const routeHandler = (ControllerClass.prototype as any)[handlerName];
        const routeMiddlewares =
          Reflect.getMetadata(
            MetadataKeys.MIDDLEWARE,
            ControllerClass.prototype,
            handlerName as string,
          ) || [];

        // Bind the handler to the single controller instance
        const handler = routeHandler.bind(controllerInstance);

        router[method](path, ...routeMiddlewares, handler);
      });

      app.use(basePath, router);
    });
  }
}
