import { Express } from "express";
import { BaseServerModule } from "../abstract";
import cors, { CorsOptions } from "cors";

export class CorsModule extends BaseServerModule {
  name = "Cors";
  priority = -90;

  private corsOptions: CorsOptions;

  constructor(corsOptions?: cors.CorsOptions) {
    super();
    this.corsOptions = corsOptions || {
      origin: "*",
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
  }

  getModuleName(): string {
    return this.name;
  }

  init(app: Express): void {
    app.use(cors(this.corsOptions));
  }
}
