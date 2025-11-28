import { BootstrapServer } from "./BootstrapServer";
import {
  CorsModule,
  ControllersModule,
  FileUploadModule,
  RateLimitModule,
  RequestContextModule,
  RoutesModule,
  SecurityModule,
} from "./modules";
import { BaseServerModule, BaseServerService } from "./abstract";

export interface BootstrapStandardServerOptions {
  modules?: {
    cors?: BaseServerModule | false;
    security?: BaseServerModule | false;
    rateLimit?: BaseServerModule | false;
    fileUpload?: BaseServerModule | false;
    requestContext?: BaseServerModule | false;
    extra?: BaseServerModule[];
  };
  services?: BaseServerService[];
}

export function BootstrapStandardServer(
  port: number,
  module: RoutesModule | ControllersModule,
  services?: BaseServerService[],
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  module: RoutesModule | ControllersModule,
  services: BaseServerService[],
  options: BootstrapStandardServerOptions,
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  module: RoutesModule | ControllersModule,
  options: BootstrapStandardServerOptions,
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  controllersModule: ControllersModule,
  services?: BaseServerService[],
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  controllersModule: ControllersModule,
  services: BaseServerService[],
  options: BootstrapStandardServerOptions,
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  controllersModule: ControllersModule,
  options: BootstrapStandardServerOptions,
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  arg2: RoutesModule | ControllersModule,
  arg3?:
    | BaseServerService[]
    | ControllersModule
    | BootstrapStandardServerOptions,
  arg4?: BaseServerService[] | BootstrapStandardServerOptions,
  arg5?: BootstrapStandardServerOptions,
): BootstrapServer {
  let routesModule: RoutesModule;
  let controllersModule: ControllersModule | undefined;
  let services: BaseServerService[] | undefined;
  let options: BootstrapStandardServerOptions | undefined;

  if (arg2 instanceof RoutesModule) {
    routesModule = arg2;
  } else if (arg2 instanceof ControllersModule) {
    controllersModule = arg2;
    routesModule = new RoutesModule();
  } else {
    throw new Error(
      "Invalid second argument. Must be RoutesModule or ControllersModule",
    );
  }

  const processOptionalArg = (
    value:
      | BaseServerService[]
      | ControllersModule
      | BootstrapStandardServerOptions
      | undefined,
  ) => {
    if (!value) {
      return;
    }

    if (value instanceof ControllersModule) {
      controllersModule = value;
      return;
    }

    if (Array.isArray(value)) {
      services = value;
      return;
    }

    options = value;
  };

  processOptionalArg(arg3 as any);
  processOptionalArg(arg4 as any);
  processOptionalArg(arg5 as any);

  if (options?.services?.length) {
    services = [...(services ?? []), ...options.services];
  }

  const modulesToRegister: BaseServerModule[] = [routesModule];

  const preset = options?.modules;
  const registerModule = (
    factory: () => BaseServerModule,
    override?: BaseServerModule | false,
  ) => {
    if (override === false) {
      return;
    }

    modulesToRegister.push(override ?? factory());
  };

  registerModule(() => new CorsModule(), preset?.cors);
  registerModule(() => new SecurityModule(), preset?.security);
  registerModule(() => new RateLimitModule(), preset?.rateLimit);
  registerModule(() => new FileUploadModule(), preset?.fileUpload);
  registerModule(() => new RequestContextModule(), preset?.requestContext);

  if (preset?.extra?.length) {
    modulesToRegister.push(...preset.extra);
  }

  const expressServer = new BootstrapServer(port).addModules(modulesToRegister);

  if (controllersModule) {
    expressServer.addModule(controllersModule);
  }

  if (services) {
    expressServer.addServices(services);
  }

  return expressServer;
}
