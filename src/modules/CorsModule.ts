import { Express } from "express";
import { BaseServerModule } from "../abstract/ServerModule";
import cors, { CorsOptions } from "cors";

export class CorsModule extends BaseServerModule {
  name = "CORS";
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

  init(app: Express): void {
    app.use(cors(this.corsOptions));
  }
}
