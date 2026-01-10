import { MetadataKeys } from "./MetadataKeys";
import { ServerHandler } from "../abstract";
import "reflect-metadata";

export function Use(middleware: ServerHandler | ServerHandler[]) {
  return function (target: any, key?: string, descriptor?: PropertyDescriptor) {
    const newMiddlewares = Array.isArray(middleware)
      ? middleware
      : [middleware];

    if (key) {
      // Method decorator
      const middlewares =
        Reflect.getMetadata<any[]>(MetadataKeys.MIDDLEWARE, target, key) || [];
      Reflect.defineMetadata(
        MetadataKeys.MIDDLEWARE,
        [...middlewares, ...newMiddlewares],
        target,
        key,
      );
    } else {
      // Class decorator
      const middlewares =
        Reflect.getMetadata<any[]>(MetadataKeys.MIDDLEWARE, target) || [];
      Reflect.defineMetadata(
        MetadataKeys.MIDDLEWARE,
        [...middlewares, ...newMiddlewares],
        target,
      );
    }
  };
}
