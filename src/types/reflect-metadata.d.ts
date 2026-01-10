declare namespace Reflect {
  function defineMetadata(
    metadataKey: string | symbol,
    metadataValue: unknown,
    target: object,
    propertyKey?: string | symbol,
  ): void;

  function getMetadata<T = unknown>(
    metadataKey: string | symbol,
    target: object,
    propertyKey?: string | symbol,
  ): T | undefined;
}
