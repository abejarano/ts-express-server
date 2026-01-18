import { BaseServerModule } from "../abstract";
import { ServerApp, ServerContext, ServerHandler } from "../abstract";
import type { CorsOptions } from "cors";

export class CorsModule extends BaseServerModule {
  name = "Cors";
  priority = -90;

  private corsOptions: CorsOptions;
  private static defaultCorsOptions: CorsOptions = {
    origin: "*",
    allowedHeaders: ["content-type"],
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  constructor(corsOptions?: CorsOptions) {
    super();
    this.corsOptions = {
      ...CorsModule.defaultCorsOptions,
      ...(corsOptions || {}),
    };
  }

  getModuleName(): string {
    return this.name;
  }

  init(app: ServerApp, context?: ServerContext): void {
    app.use(createCorsMiddleware(this.corsOptions));
  }
}

const createCorsMiddleware = (options: CorsOptions): ServerHandler => {
  return (req, res, next) => {
    const originHeader = String(req.headers?.origin || "");
    const allowOrigin = resolveOrigin(options.origin, originHeader);

    if (allowOrigin) {
      res.set("access-control-allow-origin", allowOrigin);
    }

    if (options.credentials) {
      res.set("access-control-allow-credentials", "true");
    }

    if (options.methods) {
      res.set(
        "access-control-allow-methods",
        Array.isArray(options.methods)
          ? options.methods.join(",")
          : options.methods
      );
    }

    if (options.allowedHeaders) {
      res.set(
        "access-control-allow-headers",
        Array.isArray(options.allowedHeaders)
          ? options.allowedHeaders.join(",")
          : options.allowedHeaders
      );
    }

    if (options.maxAge !== undefined) {
      res.set("access-control-max-age", String(options.maxAge));
    }

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
};

const resolveOrigin = (
  originOption: CorsOptions["origin"],
  requestOrigin: string
): string | undefined => {
  if (!originOption || originOption === "*") {
    return "*";
  }

  if (originOption === true) {
    return requestOrigin || "*";
  }

  if (typeof originOption === "string") {
    return originOption;
  }

  if (Array.isArray(originOption)) {
    return originOption.includes(requestOrigin) ? requestOrigin : undefined;
  }

  if (typeof originOption === "function") {
    let resolved: string | undefined;
    originOption(requestOrigin, (err, value) => {
      if (err) {
        return;
      }
      if (value === true) {
        resolved = requestOrigin || "*";
      } else if (typeof value === "string") {
        resolved = value;
      }
    });
    return resolved;
  }

  return undefined;
};
