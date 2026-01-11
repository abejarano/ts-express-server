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
  private statusExplicitlySet = false;
  private headers = new Headers();
  private setCookies: string[] = [];
  private body: unknown = null;
  private ended = false;
  private rawResponse?: Response;
  private readonly cookieJar?: CookieMap;
  private readonly handlerTimeoutMs?: number;
  private readonly endPromise: Promise<void>;
  private resolveEnd?: () => void;

  constructor(cookieJar?: CookieMap, handlerTimeoutMs?: number) {
    this.cookieJar = cookieJar;
    this.handlerTimeoutMs = handlerTimeoutMs;
    this.endPromise = new Promise<void>((resolve) => {
      this.resolveEnd = resolve;
    });
  }

  status(code: number): this {
    this.statusExplicitlySet = true;
    this.statusCode = code;
    return this;
  }

  set(name: string, value: string): this {
    if (name.toLowerCase() === "set-cookie") {
      this.setCookies.push(value);
      return this;
    }
    this.headers.set(name, value);
    return this;
  }

  header(name: string, value: string): this {
    return this.set(name, value);
  }

  cookie(name: string, value: string, options: CookieOptions = {}): this {
    if (this.cookieJar && typeof this.cookieJar.set === "function") {
      this.cookieJar.set(name, value, toCookieJarOptions(options));
      return this;
    }
    this.setCookies.push(serializeCookie(name, value, options));
    return this;
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

  getHandlerTimeoutMs(): number | undefined {
    return this.handlerTimeoutMs;
  }

  toResponse(): Response {
    if (this.rawResponse) {
      const headerMap = new Map<string, string>();
      const setCookies = readSetCookieHeaders(this.rawResponse.headers);
      this.rawResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          return;
        }
        headerMap.set(key.toLowerCase(), value);
      });
      this.headers.forEach((value, key) => {
        headerMap.set(key.toLowerCase(), value);
      });
      setCookies.push(...this.setCookies);

      const headersInit: Array<[string, string]> = [];
      headerMap.forEach((value, key) => {
        headersInit.push([key, value]);
      });
      for (const cookie of setCookies) {
        headersInit.push(["set-cookie", cookie]);
      }

      return new Response(this.rawResponse.body, {
        status: this.statusExplicitlySet
          ? this.statusCode
          : this.rawResponse.status,
        headers: headersInit,
      });
    }

    const headersInit: Array<[string, string]> = [];
    this.headers.forEach((value, key) => {
      headersInit.push([key, value]);
    });
    for (const cookie of this.setCookies) {
      headersInit.push(["set-cookie", cookie]);
    }

    return new Response(this.body as BodyInit | null, {
      status: this.statusCode,
      headers: headersInit,
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
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const timeoutMs = res.getHandlerTimeoutMs();
    const timeoutPromise =
      typeof timeoutMs === "number" && timeoutMs > 0
        ? new Promise<boolean>((resolve) => {
            timeoutId = setTimeout(() => {
              timedOut = true;
              if (!res.isEnded()) {
                res.status(504).json({ message: "Handler timeout" });
              }
              resolve(false);
            }, timeoutMs);
          })
        : null;
    try {
      chainCompleted = timeoutPromise
        ? await Promise.race([runHandlers(handlers, req, res), timeoutPromise])
        : await runHandlers(handlers, req, res);
    } catch (error) {
      if (!res.isEnded()) {
        res.status(500).json({ message: "Internal server error" });
      }
      done(error);
      return;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    if (timedOut) {
      done();
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
  private settings = new Map<string, unknown>();

  set(key: string, value: unknown): void {
    this.settings.set(key, value);
  }

  get(key: string): unknown {
    return this.settings.get(key);
  }

  createFetchHandler() {
    return async (request: Request, server?: any): Promise<Response> => {
      const client = server?.requestIP?.(request);
      const cookieJar = (request as unknown as { cookies?: CookieMap }).cookies;
      const handlerTimeoutMs = this.get("handlerTimeoutMs");
      const trustProxy = this.get("trustProxy") === true;
      const ipOverride = trustProxy ? undefined : client?.address;
      const req = createRequest(request, ipOverride);
      const res = new BunResponse(
        cookieJar,
        typeof handlerTimeoutMs === "number" ? handlerTimeoutMs : undefined,
      );

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
    bunApp.use(createMultipartBodyParser(bunApp));
    bunApp.use(createJsonBodyParser(bunApp));
    bunApp.use(createUrlEncodedBodyParser(bunApp));
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

const createJsonBodyParser = (app: BunApp): ServerHandler => {
  return async (req, res, next) => {
  if (!req.raw || req.body !== undefined) {
    return next();
  }

  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.includes("application/json")) {
    return next();
  }

  const limit = getBodyLimit(app);
  const contentLength = parseContentLength(req.headers["content-length"]);
  if (contentLength !== undefined && contentLength > limit) {
    res.status(413).json({ message: "Payload too large" });
    return;
  }

  try {
    req.body = await (req.raw as Request).json();
  } catch {
    res.status(400).json({ message: "Invalid JSON" });
    return;
  }
  next();
  };
};

const createUrlEncodedBodyParser = (app: BunApp): ServerHandler => {
  return async (req, res, next) => {
  if (!req.raw || req.body !== undefined) {
    return next();
  }

  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return next();
  }

  const limit = getBodyLimit(app);
  const contentLength = parseContentLength(req.headers["content-length"]);
  if (contentLength !== undefined && contentLength > limit) {
    res.status(413).json({ message: "Payload too large" });
    return;
  }

  const text = await (req.raw as Request).text();
  req.body = Object.fromEntries(new URLSearchParams(text));
  next();
  };
};

const createMultipartBodyParser = (app: BunApp): ServerHandler => {
  return async (req, res, next) => {
  if (!req.raw || req.body !== undefined) {
    return next();
  }

  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }

  const options = normalizeMultipartOptions(app.get("multipart"));
  const lengthHeader = req.headers["content-length"];
  const contentLength = parseContentLength(lengthHeader);
  if (contentLength !== undefined && contentLength > options.maxBodyBytes) {
    res.status(413).json({ message: "Payload too large" });
    return;
  }

  try {
    const formData = await (req.raw as Request).formData();
    const fields: Record<string, string | string[]> = {};
    const files: Record<string, MultipartFile[]> = {};
    let fileCount = 0;

    for (const [key, value] of formData.entries()) {
      if (isFile(value)) {
        if (value.size > options.maxFileBytes) {
          res.status(413).json({ message: "Payload too large" });
          return;
        }
        if (!isMimeAllowed(value.type, options.allowedMimeTypes)) {
          res.status(415).json({ message: "Unsupported media type" });
          return;
        }
        fileCount += 1;
        if (fileCount > options.maxFiles) {
          res.status(413).json({ message: "Payload too large" });
          return;
        }
        const bucket = files[key];
        if (bucket) {
          bucket.push(value);
        } else {
          files[key] = [value];
        }
        continue;
      }

      const existing = fields[key];
      const textValue = String(value);
      if (existing === undefined) {
        fields[key] = textValue;
      } else if (Array.isArray(existing)) {
        existing.push(textValue);
      } else {
        fields[key] = [existing, textValue];
      }
    }

    if (Object.keys(fields).length > 0) {
      req.body = fields;
    }
    if (Object.keys(files).length > 0) {
      req.files = files;
    }
  } catch {
    res.status(400).json({ message: "Invalid multipart form data" });
    return;
  }

  next();
  };
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

type CookieOptions = {
  maxAge?: number;
  domain?: string;
  path?: string;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

type CookieMap = {
  set(
    name: string,
    value: string,
    options?: {
      maxAge?: number;
      domain?: string;
      path?: string;
      expires?: Date;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "Lax" | "Strict" | "None";
    },
  ): void;
  toSetCookieHeaders?(): string[];
};

type MultipartFile = {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  lastModified?: number;
};

type MultipartOptions = {
  maxBodyBytes: number;
  maxFileBytes: number;
  maxFiles: number;
  allowedMimeTypes?: string[];
};

const DEFAULT_MULTIPART_OPTIONS: MultipartOptions = {
  maxBodyBytes: 10 * 1024 * 1024,
  maxFileBytes: 10 * 1024 * 1024,
  maxFiles: 10,
};

function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    const maxAgeSeconds = Math.floor(options.maxAge / 1000);
    parts.push(`Max-Age=${maxAgeSeconds}`);
    if (!options.expires) {
      parts.push(
        `Expires=${new Date(Date.now() + options.maxAge).toUTCString()}`,
      );
    }
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.httpOnly) {
    parts.push("HttpOnly");
  }
  if (options.secure || options.sameSite === "none") {
    parts.push("Secure");
  }
  if (options.sameSite) {
    const normalized =
      options.sameSite === "none"
        ? "None"
        : options.sameSite === "strict"
          ? "Strict"
          : "Lax";
    parts.push(`SameSite=${normalized}`);
  }

  return parts.join("; ");
}

function toCookieJarOptions(options: CookieOptions) {
  const sameSite: "None" | "Strict" | "Lax" | undefined =
    options.sameSite === "none"
      ? "None"
      : options.sameSite === "strict"
        ? "Strict"
        : options.sameSite === "lax"
          ? "Lax"
          : undefined;
  const maxAge =
    options.maxAge === undefined
      ? undefined
      : Math.floor(options.maxAge / 1000);

  return {
    maxAge,
    domain: options.domain,
    path: options.path,
    expires: options.expires,
    httpOnly: options.httpOnly,
    secure: options.secure || options.sameSite === "none",
    sameSite,
  };
}

function getBodyLimit(app: BunApp): number {
  return normalizeMultipartOptions(app.get("multipart")).maxBodyBytes;
}

function normalizeMultipartOptions(input: unknown): MultipartOptions {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_MULTIPART_OPTIONS };
  }

  const value = input as Partial<MultipartOptions>;
  return {
    maxBodyBytes:
      value.maxBodyBytes ?? DEFAULT_MULTIPART_OPTIONS.maxBodyBytes,
    maxFileBytes:
      value.maxFileBytes ?? DEFAULT_MULTIPART_OPTIONS.maxFileBytes,
    maxFiles: value.maxFiles ?? DEFAULT_MULTIPART_OPTIONS.maxFiles,
    allowedMimeTypes: value.allowedMimeTypes,
  };
}

function isMimeAllowed(type: string, allowed?: string[]): boolean {
  if (!allowed || allowed.length === 0) {
    return true;
  }
  const normalized = type.toLowerCase();
  for (const entry of allowed) {
    const rule = entry.toLowerCase();
    if (rule.endsWith("/*")) {
      const prefix = rule.slice(0, -1);
      if (normalized.startsWith(prefix)) {
        return true;
      }
      continue;
    }
    if (normalized === rule) {
      return true;
    }
  }
  return false;
}

function isFile(value: unknown): value is MultipartFile {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (
    typeof (value as MultipartFile).arrayBuffer === "function" &&
    typeof (value as MultipartFile).name === "string" &&
    typeof (value as MultipartFile).size === "number"
  );
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
    try {
      cookies[name] = decodeURIComponent(rest.join("="));
    } catch {
      cookies[name] = rest.join("=");
    }
  });
  return cookies;
}

function parseContentLength(
  header: string | string[] | undefined,
): number | undefined {
  if (header === undefined) {
    return undefined;
  }
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function readSetCookieHeaders(headers: Headers): string[] {
  const bunHeaders = headers as Headers & {
    getSetCookie?: () => string[];
    getAll?: (name: string) => string[];
  };
  const setCookieFromApi =
    bunHeaders.getSetCookie?.() ?? bunHeaders.getAll?.("Set-Cookie");
  if (setCookieFromApi && setCookieFromApi.length > 0) {
    return setCookieFromApi;
  }

  const setCookies: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      setCookies.push(value);
    }
  });
  return setCookies;
}

export function getFiles(
  req: ServerRequest,
  field: string,
): MultipartFile[] {
  const map = (req.files ?? {}) as Record<string, MultipartFile[]>;
  return map[field] ?? [];
}

export function getFile(
  req: ServerRequest,
  field: string,
): MultipartFile | undefined {
  return getFiles(req, field)[0];
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
