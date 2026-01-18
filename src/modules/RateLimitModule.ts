import { BaseServerModule } from "../abstract";
import { ServerApp, ServerContext, ServerHandler } from "../abstract";

export type RateLimitOptions = {
  windowMs?: number;
  limit?: number;
  max?: number;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  message?: string | Record<string, unknown>;
};

export class RateLimitModule extends BaseServerModule {
  name = "RateLimit";
  priority = -70;

  private limiterOptions: Partial<RateLimitOptions>;

  constructor(limiterOptions?: Partial<RateLimitOptions>) {
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
    app.use(createRateLimitMiddleware(this.limiterOptions));
  }
}

const createRateLimitMiddleware = (
  options: Partial<RateLimitOptions>,
): ServerHandler => {
  const windowMsOption = options?.windowMs;
  const windowMs = typeof windowMsOption === "number" ? windowMsOption : 8 * 60 * 1000;
  const legacyMax = (options as { max?: number } | undefined)?.max;
  const limitOption = options?.limit ?? legacyMax;
  const limit = typeof limitOption === "number" ? limitOption : 100;
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
      const message =
        typeof options?.message === "string" ||
        (typeof options?.message === "object" && options?.message)
          ? options.message
          : undefined;
      res.status(429).json(
        message || {
          message: "Too many requests, please try again later.",
        },
      );
      return;
    }

    next();
  };
};
