import { BaseServerModule } from "../abstract";
import {
  NextFunction,
  ServerApp,
  ServerContext,
  ServerRequest,
  ServerResponse,
} from "../abstract";
import { BunAdapter } from "../adapters";
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

  init(app: ServerApp, context?: ServerContext): void {
    this.controllers.forEach((ControllerClass) => {
      const basePath = Reflect.getMetadata<string>(
        MetadataKeys.BASE_PATH,
        ControllerClass,
      );
      const classMiddlewares =
        Reflect.getMetadata<any[]>(
          MetadataKeys.MIDDLEWARE,
          ControllerClass,
        ) || [];
      const routers: IRouter[] =
        Reflect.getMetadata<IRouter[]>(
          MetadataKeys.ROUTERS,
          ControllerClass.prototype,
        ) || [];

      if (!basePath) {
        return;
      }

      const adapter = context?.adapter ?? new BunAdapter();
      const router = adapter.createRouter();

      // Create a single controller instance per controller class (singleton pattern)
      const controllerInstance = new (ControllerClass as any)();

      // Apply class-level middlewares
      if (classMiddlewares.length > 0) {
        router.use(classMiddlewares);
      }

      routers.forEach(({ method, path, handlerName }) => {
        const routeHandler = (ControllerClass.prototype as any)[handlerName];
        const routeMiddlewares =
          Reflect.getMetadata<any[]>(
            MetadataKeys.MIDDLEWARE,
            ControllerClass.prototype,
            handlerName as string,
          ) || [];

        const parameterMetadata: ParameterMetadata[] =
          Reflect.getMetadata<ParameterMetadata[]>(
            MetadataKeys.PARAMETERS,
            ControllerClass.prototype,
            handlerName as string,
          ) || [];

        const routerMethod = (router as any)[method]?.bind(router) as (
          path: string,
          ...handlers: any[]
        ) => void;

        routerMethod(
          path,
          ...routeMiddlewares,
          async (req: ServerRequest, res: ServerResponse, next: NextFunction) => {
          if (parameterMetadata.length === 0) {
            try {
              const result = routeHandler.call(
                controllerInstance,
                req,
                res,
                next
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
            ...parameterMetadata.map((param) => param.index)
          );

          const args = new Array(Math.max(0, maxIndex + 1));

          parameterMetadata.forEach((param) => {
            switch (param.type) {
              case ParameterType.BODY:
                if (param.data) {
                  const body = req.body as Record<string, unknown> | undefined;
                  args[param.index] = body ? body[param.data] : undefined;
                } else {
                  args[param.index] = req.body;
                }
                break;
              case ParameterType.PARAM:
                args[param.index] = param.data
                  ? (req.params?.[param.data] as any)
                  : req.params;
                break;
              case ParameterType.QUERY:
                args[param.index] =
                  param.data && req.query ? req.query[param.data] : req.query;
                break;
              case ParameterType.HEADERS:
                if (param.data) {
                  const headerKey = param.data.toLowerCase();
                  args[param.index] = req.headers?.[headerKey] as any;
                } else {
                  args[param.index] = req.headers;
                }
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

          // Fallbacks for common handler arguments when not explicitly decorated
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
          },
        );
      });

      app.use(basePath, router);
    });
  }
}
