import "reflect-metadata";
import { MetadataKeys } from "./MetadataKeys";

export enum ParameterType {
  BODY = "body",
  QUERY = "query",
  PARAM = "param",
  HEADERS = "headers",
  REQUEST = "request",
  RESPONSE = "response",
  NEXT = "next",
  FILE = "file",
}

export interface ParameterMetadata {
  index: number;
  type: ParameterType;
  data?: string;
}

// Helper to register parameter metadata for a method
function addParameterMetadata(
  target: object,
  propertyKey: string | symbol,
  metadata: ParameterMetadata,
): void {
  const existingParameters: ParameterMetadata[] =
    Reflect.getMetadata(MetadataKeys.PARAMETERS, target, propertyKey) || [];

  Reflect.defineMetadata(
    MetadataKeys.PARAMETERS,
    [...existingParameters, metadata].sort((a, b) => a.index - b.index),
    target,
    propertyKey,
  );
}

function createParameterDecorator(type: ParameterType) {
  return (data?: string): ParameterDecorator =>
    (target, propertyKey, parameterIndex) => {
      if (propertyKey === undefined) {
        throw new Error("Parameter decorators can only be used on methods");
      }
      addParameterMetadata(target, propertyKey, {
        index: parameterIndex,
        type,
        data,
      });
    };
}

export const Body = createParameterDecorator(ParameterType.BODY);
export const Query = createParameterDecorator(ParameterType.QUERY);
export const Param = createParameterDecorator(ParameterType.PARAM);
export const Headers = createParameterDecorator(ParameterType.HEADERS);
export const Req = createParameterDecorator(ParameterType.REQUEST);
export const Res = createParameterDecorator(ParameterType.RESPONSE);
export const Next = createParameterDecorator(ParameterType.NEXT);
export const UploadedFile = createParameterDecorator(ParameterType.FILE);
