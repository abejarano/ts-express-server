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
import { BaseServerModule, BaseServerService, ServerRuntime } from "./abstract";

export interface BootstrapStandardServerOptions {
  runtime?: ServerRuntime;
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
  services?: BaseServerService[]
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  module: RoutesModule | ControllersModule,
  services: BaseServerService[],
  options: BootstrapStandardServerOptions
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  module: RoutesModule | ControllersModule,
  options: BootstrapStandardServerOptions
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  controllersModule: ControllersModule,
  services?: BaseServerService[]
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  controllersModule: ControllersModule,
  services: BaseServerService[],
  options: BootstrapStandardServerOptions
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  routes: RoutesModule,
  controllersModule: ControllersModule,
  options: BootstrapStandardServerOptions
): BootstrapServer;

export function BootstrapStandardServer(
  port: number,
  arg2: RoutesModule | ControllersModule,
  arg3?:
    | BaseServerService[]
    | ControllersModule
    | BootstrapStandardServerOptions,
  arg4?: BaseServerService[] | BootstrapStandardServerOptions,
  arg5?: BootstrapStandardServerOptions
): BootstrapServer {
  let routesModule: RoutesModule;
  let controllersModule: ControllersModule | undefined;
  let services: BaseServerService[] | undefined;
  let options: BootstrapStandardServerOptions | undefined;

  const setControllersModule = (module: ControllersModule) => {
    if (controllersModule && controllersModule !== module) {
      throw new Error(
        "ControllersModule provided multiple times. Pass a single instance only."
      );
    }
    controllersModule = module;
  };

  if (arg2 instanceof RoutesModule) {
    routesModule = arg2;
  } else if (arg2 instanceof ControllersModule) {
    setControllersModule(arg2);
    routesModule = new RoutesModule();
  } else {
    throw new Error(
      "Invalid second argument. Must be RoutesModule or ControllersModule"
    );
  }

  const addServices = (value: BaseServerService[] | undefined) => {
    if (!value?.length) {
      return;
    }
    services = [...(services ?? []), ...value];
  };

  const processOptionalArg = (
    value:
      | BaseServerService[]
      | ControllersModule
      | BootstrapStandardServerOptions
      | undefined
  ) => {
    if (!value) {
      return;
    }

    if (value instanceof ControllersModule) {
      setControllersModule(value);
      return;
    }

    if (Array.isArray(value)) {
      addServices(value);
      return;
    }

    options = value;
  };

  processOptionalArg(arg3 as any);
  processOptionalArg(arg4 as any);
  processOptionalArg(arg5 as any);

  addServices(options?.services);

  const modulesToRegister: BaseServerModule[] = [routesModule];

  const preset = options?.modules;
  const registerModule = (
    factory: () => BaseServerModule,
    override?: BaseServerModule | false
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

  const server = new BootstrapServer(port, {
    runtime: options?.runtime,
  }).addModules(modulesToRegister);

  if (controllersModule) {
    server.addModule(controllersModule);
  }

  if (services) {
    server.addServices(services);
  }

  return server;
}
