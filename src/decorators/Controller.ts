import { MetadataKeys } from "./MetadataKeys";
import "reflect-metadata";

export function Controller(basePath: string) {
  return function (target: Function) {
    Reflect.defineMetadata(MetadataKeys.BASE_PATH, basePath, target);
  };
}
