import { BaseServerModule } from "../abstract";
import { ServerApp, ServerContext, ServerHandler } from "../abstract";
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
    app.use(createSecurityMiddleware(this.helmetOptions));
  }
}

const createSecurityMiddleware = (options: HelmetOptions): ServerHandler => {
  return (_req, res, next) => {
    const frameguard = options?.frameguard;
    if (frameguard && typeof frameguard === "object" && "action" in frameguard) {
      const action = (frameguard as { action?: string }).action;
      if (action) {
        res.set("x-frame-options", action.toUpperCase());
      }
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

    const referrerPolicy = options?.referrerPolicy;
    if (referrerPolicy && typeof referrerPolicy === "object" && "policy" in referrerPolicy) {
      res.set(
        "referrer-policy",
        Array.isArray(referrerPolicy.policy)
          ? referrerPolicy.policy.join(",")
          : referrerPolicy.policy,
      );
    }

    if (options?.dnsPrefetchControl) {
      res.set("x-dns-prefetch-control", "on");
    }

    next();
  };
};
