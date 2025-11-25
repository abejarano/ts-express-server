import { MetadataKeys } from "./MetadataKeys";
import "reflect-metadata";

export enum Methods {
  GET = "get",
  POST = "post",
  PUT = "put",
  DELETE = "delete",
  PATCH = "patch",
}

export interface IRouter {
  method: Methods;
  path: string;
  handlerName: string | symbol;
}

function methodDecorator(method: Methods) {
  return function (path: string) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
      const routers: IRouter[] =
        Reflect.getMetadata(MetadataKeys.ROUTERS, target) || [];

      routers.push({
        method,
        path,
        handlerName: key,
      });

      Reflect.defineMetadata(MetadataKeys.ROUTERS, routers, target);
    };
  };
}

export const Get = methodDecorator(Methods.GET);
export const Post = methodDecorator(Methods.POST);
export const Put = methodDecorator(Methods.PUT);
export const Delete = methodDecorator(Methods.DELETE);
export const Patch = methodDecorator(Methods.PATCH);
