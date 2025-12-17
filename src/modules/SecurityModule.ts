import { Express } from "express";
import helmet from "helmet";
import { BaseServerModule } from "../abstract";

export class SecurityModule extends BaseServerModule {
  name = "Security";
  priority = -80;

  private readonly helmetOptions: Parameters<typeof helmet>[0];

  constructor(helmetOptions?: Parameters<typeof helmet>[0]) {
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

  init(app: Express): void {
    app.use(helmet(this.helmetOptions));
  }
}
