import { BaseServerModule } from "../abstract";
import {
  ServerApp,
  ServerContext,
  ServerHandler,
  ServerRuntime,
} from "../abstract";
import type { HelmetOptions } from "helmet";

export class SecurityModule extends BaseServerModule {
  name = "Security";
  priority = -80;

  private readonly helmetOptions: HelmetOptions;

  constructor(helmetOptions?: HelmetOptions) {
    super();
    this.helmetOptions = helmetOptions || {
      contentSecurityPolicy: false,

      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,

      crossOriginResourcePolicy: false,

      dnsPrefetchControl: true,
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: "no-referrer" },
    };
  }
  getModuleName(): string {
    return this.name;
  }

  init(app: ServerApp, context?: ServerContext): void {
    const runtime = context?.runtime ?? ServerRuntime.Express;
    if (runtime === ServerRuntime.Express) {
      const helmet = require("helmet") as typeof import("helmet");
      app.use(helmet(this.helmetOptions) as ServerHandler);
      return;
    }

    app.use(createSecurityMiddleware(this.helmetOptions));
  }
}

const createSecurityMiddleware = (options: HelmetOptions): ServerHandler => {
  return (_req, res, next) => {
    if (options?.frameguard?.action) {
      res.set("x-frame-options", options.frameguard.action.toUpperCase());
    }

    if (options?.ieNoOpen !== false) {
      res.set("x-download-options", "noopen");
    }

    if (options?.noSniff !== false) {
      res.set("x-content-type-options", "nosniff");
    }

    if (options?.originAgentCluster) {
      res.set("origin-agent-cluster", "?1");
    }

    if (options?.permittedCrossDomainPolicies === false) {
      res.set("x-permitted-cross-domain-policies", "none");
    }

    if (options?.referrerPolicy?.policy) {
      res.set(
        "referrer-policy",
        Array.isArray(options.referrerPolicy.policy)
          ? options.referrerPolicy.policy.join(",")
          : options.referrerPolicy.policy,
      );
    }

    if (options?.dnsPrefetchControl) {
      res.set("x-dns-prefetch-control", "on");
    }

    next();
  };
};
