import { Express } from "express";
import helmet from "helmet";
import { BaseServerModule } from "../abstract/ServerModule";

export class SecurityModule extends BaseServerModule {
  name = "Security";
  priority = -80;

  private helmetOptions: Parameters<typeof helmet>[0];

  constructor(helmetOptions?: Parameters<typeof helmet>[0]) {
    super();
    this.helmetOptions = helmetOptions || {
      xXssProtection: true,
    };
  }

  init(app: Express): void {
    app.use(helmet(this.helmetOptions));
  }
}
