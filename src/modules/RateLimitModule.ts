import { Express } from "express";
import { BaseServerModule } from "../abstract";

import rateLimit from "express-rate-limit";

export class RateLimitModule extends BaseServerModule {
  name = "RateLimit";
  priority = -70;

  private limiterOptions: Parameters<typeof rateLimit>[0];

  constructor(limiterOptions?: Parameters<typeof rateLimit>[0]) {
    super();
    this.limiterOptions = limiterOptions || {
      windowMs: 8 * 60 * 1000, // 8 minutes
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
    };
  }

  init(app: Express): void {
    const limiter = rateLimit(this.limiterOptions);
    app.use(limiter);
  }
}
