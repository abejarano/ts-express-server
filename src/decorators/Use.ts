import { MetadataKeys } from "./MetadataKeys";
import { assertLegacyDecorator } from "./DecoratorGuards";
import { ServerHandler } from "../abstract";
import "reflect-metadata";

export function Use(middleware: ServerHandler | ServerHandler[]) {
  return function (...args: any[]) {
    assertLegacyDecorator(args, "@Use");
    const target = args[0];
    const key = args[1] as string | symbol | undefined;
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
