import { Express, Router } from "express";
import { BaseServerModule } from "../abstract";
import { MetadataKeys } from "../decorators/MetadataKeys";
import { IRouter } from "../decorators/Handlers";
import { ParameterMetadata, ParameterType } from "../decorators/Parameters";
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

        const parameterMetadata: ParameterMetadata[] =
          Reflect.getMetadata(
            MetadataKeys.PARAMETERS,
            ControllerClass.prototype,
            handlerName as string,
          ) || [];

        router[method](path, ...routeMiddlewares, async (req, res, next) => {
          if (parameterMetadata.length === 0) {
            try {
              const result = routeHandler.call(
                controllerInstance,
                req,
                res,
                next,
              );
              if (result instanceof Promise) {
                await result;
              }
              return result;
            } catch (error) {
              return next(error);
            }
          }

          const maxIndex = Math.max(
            routeHandler.length - 1,
            ...parameterMetadata.map((param) => param.index),
          );

          const args = new Array(Math.max(0, maxIndex + 1));

          parameterMetadata.forEach((param) => {
            switch (param.type) {
              case ParameterType.BODY:
                args[param.index] =
                  param.data && req.body ? req.body[param.data] : req.body;
                break;
              case ParameterType.PARAM:
                args[param.index] =
                  param.data && req.params
                    ? req.params[param.data]
                    : req.params;
                break;
              case ParameterType.QUERY:
                args[param.index] =
                  param.data && req.query ? req.query[param.data] : req.query;
                break;
              case ParameterType.HEADERS:
                args[param.index] =
                  param.data && req.headers
                    ? req.headers[param.data.toLowerCase()]
                    : req.headers;
                break;
              case ParameterType.FILE: {
                const files: any = (req as any).files;
                if (!files) {
                  args[param.index] = undefined;
                  break;
                }
                if (param.data) {
                  args[param.index] = files[param.data];
                } else {
                  args[param.index] = files;
                }
                break;
              }
              case ParameterType.REQUEST:
                args[param.index] = req;
                break;
              case ParameterType.RESPONSE:
                args[param.index] = res;
                break;
              case ParameterType.NEXT:
                args[param.index] = next;
                break;
              default:
                args[param.index] = undefined;
                break;
            }
          });

          // Fallbacks for common Express arguments when not explicitly decorated
          if (args[0] === undefined) {
            args[0] = req;
          }
          if (args[1] === undefined) {
            args[1] = res;
          }
          if (args[2] === undefined) {
            args[2] = next;
          }

          try {
            const result = routeHandler.apply(controllerInstance, args);
            if (result instanceof Promise) {
              await result;
            }
            return result;
          } catch (error) {
            return next(error);
          }
        });
      });

      app.use(basePath, router);
    });
  }
}
