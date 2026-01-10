import { BaseServerModule } from "../abstract";
import {
  ServerApp,
  ServerContext,
  ServerHandler,
  ServerRuntime,
} from "../abstract";

import type { Options as RateLimitOptions } from "express-rate-limit";

export class RateLimitModule extends BaseServerModule {
  name = "RateLimit";
  priority = -70;

  private limiterOptions: RateLimitOptions;

  constructor(limiterOptions?: RateLimitOptions) {
    super();
    this.limiterOptions = limiterOptions || {
      windowMs: 8 * 60 * 1000, // 8 minutes
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
    };
  }

  getModuleName(): string {
    return this.name;
  }

  init(app: ServerApp, context?: ServerContext): void {
    const runtime = context?.runtime ?? ServerRuntime.Express;
    if (runtime === ServerRuntime.Express) {
      const rateLimit =
        require("express-rate-limit") as typeof import("express-rate-limit");
      const limiter = rateLimit(this.limiterOptions);
      app.use(limiter as ServerHandler);
      return;
    }

    app.use(createRateLimitMiddleware(this.limiterOptions));
  }
}

const createRateLimitMiddleware = (
  options: RateLimitOptions,
): ServerHandler => {
  const windowMs = options?.windowMs ?? 8 * 60 * 1000;
  const legacyMax = (options as { max?: number } | undefined)?.max;
  const limit = options?.limit ?? legacyMax ?? 100;
  const hits = new Map<string, { count: number; expiresAt: number }>();

  return (req, res, next) => {
    const key = req.ip || String(req.headers?.["x-forwarded-for"] || "unknown");
    const now = Date.now();
    const existing = hits.get(key);

    if (!existing || existing.expiresAt <= now) {
      hits.set(key, { count: 1, expiresAt: now + windowMs });
    } else {
      existing.count += 1;
    }

    const current = hits.get(key)!;
    const remaining = Math.max(0, limit - current.count);

    if (options?.standardHeaders) {
      res.set("ratelimit-limit", String(limit));
      res.set("ratelimit-remaining", String(remaining));
      res.set("ratelimit-reset", String(Math.ceil(current.expiresAt / 1000)));
    }

    if (current.count > limit) {
      res.status(429).json(
        options?.message || {
          message: "Too many requests, please try again later.",
        },
      );
      return;
    }

    next();
  };
};
