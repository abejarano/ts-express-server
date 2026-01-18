import { BunKitServer } from "./BunKitServer";
import {
  CorsModule,
  ControllersModule,
  FileUploadModule,
  RateLimitModule,
  RequestContextModule,
  SecurityModule,
} from "./modules";
import {
  BaseServerModule,
  BaseServerService,
  ServerAdapter,
} from "./abstract";

export interface BunKitStandardServerOptions {
  adapter?: ServerAdapter;
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

export function BunKitStandardServer(
  port: number,
  module: ControllersModule,
  services?: BaseServerService[]
): BunKitServer;

export function BunKitStandardServer(
  port: number,
  module: ControllersModule,
  services: BaseServerService[],
  options: BunKitStandardServerOptions
): BunKitServer;

export function BunKitStandardServer(
  port: number,
  module: ControllersModule,
  options: BunKitStandardServerOptions
): BunKitServer;

export function BunKitStandardServer(
  port: number,
  arg2: ControllersModule,
  arg3?: BaseServerService[] | BunKitStandardServerOptions,
  arg4?: BunKitStandardServerOptions
): BunKitServer {
  let controllersModule: ControllersModule;
  let services: BaseServerService[] | undefined;
  let options: BunKitStandardServerOptions | undefined;

  controllersModule = arg2;

  const addServices = (value: BaseServerService[] | undefined) => {
    if (!value?.length) {
      return;
    }
    services = [...(services ?? []), ...value];
  };

  const processOptionalArg = (
    value:
      | BaseServerService[]
      | BunKitStandardServerOptions
      | undefined
  ) => {
    if (!value) {
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

  addServices(options?.services);

  const modulesToRegister: BaseServerModule[] = [controllersModule];

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

  const server = new BunKitServer(port, {
    adapter: options?.adapter,
  }).addModules(modulesToRegister);

  if (services) {
    server.addServices(services);
  }

  return server;
}
