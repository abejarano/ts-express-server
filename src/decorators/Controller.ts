import { MetadataKeys } from "./MetadataKeys";
import { assertLegacyDecorator } from "./DecoratorGuards";
import "reflect-metadata";

export function Controller(basePath: string) {
  return function (...args: any[]) {
    assertLegacyDecorator(args, "@Controller");
    const target = args[0] as Function;
    Reflect.defineMetadata(MetadataKeys.BASE_PATH, basePath, target);
  };
}
