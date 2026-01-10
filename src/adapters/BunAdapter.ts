import {
  NextFunction,
  ServerAdapter,
  ServerApp,
  ServerHandler,
  ServerInstance,
  ServerRequest,
  ServerResponse,
  ServerRouter,
  ServerRuntime,
} from "../abstract/ServerTypes";

declare const Bun: any;

type MiddlewareLayer = {
  path?: string;
  handlers: ServerHandler[];
};

type RouteLayer = {
  method: string;
  path: string;
  handlers: ServerHandler[];
};

class BunResponse implements ServerResponse {
  private statusCode = 200;
  private headers = new Headers();
  private body: unknown = null;
  private ended = false;
  private rawResponse?: Response;
  private readonly endPromise: Promise<void>;
  private resolveEnd?: () => void;

  constructor() {
    this.endPromise = new Promise<void>((resolve) => {
      this.resolveEnd = resolve;
    });
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  set(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }

  header(name: string, value: string): this {
    return this.set(name, value);
  }

  json(body: unknown): void {
    if (!this.headers.has("content-type")) {
      this.headers.set("content-type", "application/json");
    }
    this.body = JSON.stringify(body ?? null);
    this.ended = true;
    this.resolveEnd?.();
  }

  send(body: unknown): void {
    if (body instanceof Response) {
      this.rawResponse = body;
      this.ended = true;
      this.resolveEnd?.();
      return;
    }

    if (typeof body === "string" || body instanceof Uint8Array) {
      this.body = body;
      this.ended = true;
      this.resolveEnd?.();
      return;
    }

    if (body === undefined) {
      this.body = null;
      this.ended = true;
      this.resolveEnd?.();
      return;
    }

    if (!this.headers.has("content-type")) {
      this.headers.set("content-type", "application/json");
    }
    this.body = JSON.stringify(body);
    this.ended = true;
    this.resolveEnd?.();
  }

  end(body?: unknown): void {
    if (body !== undefined) {
      this.send(body);
      return;
    }
    this.ended = true;
    this.resolveEnd?.();
  }

  isEnded(): boolean {
    return this.ended;
  }

  waitForEnd(): Promise<void> {
    return this.endPromise;
  }

  toResponse(): Response {
    if (this.rawResponse) {
      return this.rawResponse;
    }

    return new Response(this.body as BodyInit | null, {
      status: this.statusCode,
      headers: this.headers,
    });
  }
}

class BunRouter implements ServerRouter {
  private middlewares: MiddlewareLayer[] = [];
  private routes: RouteLayer[] = [];

  use(
    pathOrHandler: string | ServerHandler | ServerHandler[] | ServerRouter,
    ...handlers: Array<ServerHandler | ServerHandler[] | ServerRouter>
  ): void {
    if (typeof pathOrHandler === "string") {
      const path = pathOrHandler;
      const resolvedHandlers = normalizeHandlers(handlers).map((handler) =>
        handler instanceof BunRouter
          ? this.wrapRouter(handler, path)
          : (handler as ServerHandler),
      );
      this.middlewares.push({ path, handlers: resolvedHandlers });
      return;
    }

    const resolvedHandlers = normalizeHandlers([pathOrHandler, ...handlers]);
    const wrappedHandlers = resolvedHandlers.map((handler) =>
      handler instanceof BunRouter
        ? this.wrapRouter(handler as BunRouter)
        : (handler as ServerHandler),
    );
    this.middlewares.push({ handlers: wrappedHandlers });
  }

  get(path: string, ...handlers: ServerHandler[]): void {
    this.routes.push({ method: "GET", path, handlers });
  }

  post(path: string, ...handlers: ServerHandler[]): void {
    this.routes.push({ method: "POST", path, handlers });
  }

  put(path: string, ...handlers: ServerHandler[]): void {
    this.routes.push({ method: "PUT", path, handlers });
  }

  delete(path: string, ...handlers: ServerHandler[]): void {
    this.routes.push({ method: "DELETE", path, handlers });
  }

  patch(path: string, ...handlers: ServerHandler[]): void {
    this.routes.push({ method: "PATCH", path, handlers });
  }

  async handle(
    req: ServerRequest,
    res: BunResponse,
    done: NextFunction,
    pathOverride?: string,
    suppressNotFound?: boolean,
  ): Promise<void> {
    const path = normalizePath(pathOverride ?? req.path);
    const middlewares = this.collectMiddlewares(path);
    const routeMatch = this.matchRoute(req.method, path);

    if (routeMatch) {
      req.params = routeMatch.params;
    }

    const handlers = [
      ...middlewares.flatMap((mw) => mw.handlers),
      ...(routeMatch ? routeMatch.route.handlers : []),
    ];

    let chainCompleted = false;
    try {
      chainCompleted = await runHandlers(handlers, req, res);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
      done(error);
      return;
    }

    if (!routeMatch) {
      if (chainCompleted && !res.isEnded() && !suppressNotFound) {
        res.status(404).json({ message: "Not found" });
      }
      if (chainCompleted) {
        done();
      }
      return;
    }

    if (chainCompleted) {
      done();
    }
  }

  private collectMiddlewares(path: string): MiddlewareLayer[] {
    return this.middlewares.filter((layer) => {
      if (!layer.path) {
        return true;
      }
      const normalized = normalizePath(layer.path);
      if (normalized === "/") {
        return true;
      }
      return path === normalized || path.startsWith(`${normalized}/`);
    });
  }

  private matchRoute(method: string, path: string) {
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) {
        continue;
      }
      const match = matchPath(route.path, path);
      if (match) {
        return { route, params: match };
      }
    }
    return null;
  }

  private wrapRouter(router: BunRouter, basePath?: string): ServerHandler {
    return async (req, res, next) => {
      if (!basePath) {
        await router.handle(req, res as BunResponse, next, undefined, true);
        return;
      }

      const normalizedBase = normalizePath(basePath);
      const currentPath = normalizePath(req.path);
      if (normalizedBase === "/") {
        await router.handle(req, res as BunResponse, next, currentPath, true);
        return;
      }
      if (
        currentPath !== normalizedBase &&
        !currentPath.startsWith(`${normalizedBase}/`)
      ) {
        return next();
      }

      const nestedPath = stripPrefix(currentPath, normalizedBase);
      await router.handle(req, res as BunResponse, next, nestedPath, true);
    };
  }
}

class BunApp extends BunRouter implements ServerApp {
  createFetchHandler() {
    return async (request: Request, server?: any): Promise<Response> => {
      const client = server?.requestIP?.(request);
      const req = createRequest(request, client?.address);
      const res = new BunResponse();

      await this.handle(req, res, () => undefined);

      if (!res.isEnded()) {
        res.status(204).end();
      }

      return res.toResponse();
    };
  }
}

export class BunAdapter implements ServerAdapter {
  runtime = ServerRuntime.Bun;

  createApp(): ServerApp {
    return new BunApp();
  }

  createRouter(): ServerRouter {
    return new BunRouter();
  }

  configure(app: ServerApp, _port: number): void {
    const bunApp = app as BunApp;
    bunApp.use(parseJsonBody);
    bunApp.use(parseUrlEncodedBody);
  }

  listen(app: ServerApp, port: number, onListen: () => void): ServerInstance {
    const bunApp = app as BunApp;
    const server = Bun.serve({
      port,
      fetch: bunApp.createFetchHandler(),
    });
    onListen();
    return {
      close: (callback?: () => void) => {
        server.stop(true);
        callback?.();
      },
    };
  }
}

const parseJsonBody: ServerHandler = async (req, _res, next) => {
  if (!req.raw || req.body !== undefined) {
    return next();
  }

  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.includes("application/json")) {
    return next();
  }

  try {
    req.body = await (req.raw as Request).json();
  } catch {
    req.body = undefined;
  }
  next();
};

const parseUrlEncodedBody: ServerHandler = async (req, _res, next) => {
  if (!req.raw || req.body !== undefined) {
    return next();
  }

  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return next();
  }

  const text = await (req.raw as Request).text();
  req.body = Object.fromEntries(new URLSearchParams(text));
  next();
};

function createRequest(request: Request, ipOverride?: string): ServerRequest {
  const url = new URL(request.url);
  const headers = toHeaderRecord(request.headers);
  const query = toQueryRecord(url.searchParams);

  return {
    method: request.method.toUpperCase(),
    path: normalizePath(url.pathname),
    originalUrl: url.pathname + url.search,
    params: {},
    query,
    headers,
    cookies: parseCookies(headers.cookie),
    ip: ipOverride || extractIp(headers),
    raw: request,
  };
}

function toHeaderRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

function toQueryRecord(search: URLSearchParams): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  for (const [key, value] of search.entries()) {
    const existing = record[key];
    if (existing === undefined) {
      record[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      record[key] = [existing, value];
    }
  }
  return record;
}

function parseCookies(cookieHeader?: string): Record<string, string> | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((entry) => {
    const [name, ...rest] = entry.trim().split("=");
    if (!name) {
      return;
    }
    cookies[name] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

function extractIp(headers: Record<string, string>): string | undefined {
  const forwarded = headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  return headers["x-real-ip"];
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function stripPrefix(path: string, prefix: string): string {
  if (!path.startsWith(prefix)) {
    return path;
  }
  const stripped = path.slice(prefix.length);
  return normalizePath(stripped || "/");
}

function matchPath(
  routePath: string,
  requestPath: string,
): Record<string, string> | null {
  const normalizedRoute = normalizePath(routePath);
  const normalizedRequest = normalizePath(requestPath);

  if (normalizedRoute === normalizedRequest) {
    return {};
  }

  const routeParts = normalizedRoute.split("/").filter(Boolean);
  const requestParts = normalizedRequest.split("/").filter(Boolean);
  if (routeParts.length !== requestParts.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let index = 0; index < routeParts.length; index += 1) {
    const routePart = routeParts[index];
    const requestPart = requestParts[index];

    if (routePart.startsWith(":")) {
      params[routePart.slice(1)] = decodeURIComponent(requestPart);
      continue;
    }

    if (routePart !== requestPart) {
      return null;
    }
  }

  return params;
}

function normalizeHandlers(
  inputs: Array<ServerHandler | ServerHandler[] | ServerRouter>,
): Array<ServerHandler | ServerRouter> {
  const handlers: Array<ServerHandler | ServerRouter> = [];
  for (const input of inputs) {
    if (Array.isArray(input)) {
      handlers.push(...input);
      continue;
    }
    handlers.push(input);
  }
  return handlers;
}

async function runHandlers(
  handlers: ServerHandler[],
  req: ServerRequest,
  res: BunResponse,
): Promise<boolean> {
  let index = 0;

  const dispatch = async (): Promise<boolean> => {
    const handler = handlers[index];
    index += 1;
    if (!handler) {
      return true;
    }

    let nextCalled = false;
    let nextPromise: Promise<boolean> | undefined;
    let resolveNext: (() => void) | undefined;
    const nextSignal = new Promise<void>((resolve) => {
      resolveNext = resolve;
    });
    const wrappedNext: NextFunction = (nextErr?: unknown) => {
      if (nextErr) {
        throw nextErr;
      }
      nextCalled = true;
      resolveNext?.();
      nextPromise = dispatch();
      return nextPromise as unknown as void;
    };

    await handler(req, res, wrappedNext);

    if (!nextCalled) {
      if (res.isEnded()) {
        return false;
      }
      await Promise.race([nextSignal, res.waitForEnd()]);
      if (!nextCalled || res.isEnded()) {
        return false;
      }
    }

    return nextPromise ? await nextPromise : true;
  };

  return dispatch();
}
