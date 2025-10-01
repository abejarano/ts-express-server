import { Express } from "express";
import helmet from "helmet";
import { BaseServerModule } from "../abstract/ServerModule";

export class SecurityModule extends BaseServerModule {
  name = "Security";
  priority = -80;

  private readonly helmetOptions: Parameters<typeof helmet>[0];

  constructor(helmetOptions?: Parameters<typeof helmet>[0]) {
    super();
    this.helmetOptions = helmetOptions || {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: true,
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: "no-referrer" },
      xssFilter: true,
    };
  }

  init(app: Express): void {
    app.use(helmet(this.helmetOptions));
  }
}
