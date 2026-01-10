export enum ServerRuntime {
  Express = "express",
  Bun = "bun",
}

export type NextFunction = (err?: unknown) => void;

// Keep handler parameters loose to stay compatible with Express signatures.
export type ServerHandler = (req: any, res: any, next: NextFunction) => any;

export interface ServerRequest {
  method: string;
  path: string;
  originalUrl?: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  files?: unknown;
  cookies?: Record<string, string>;
  ip?: string;
  requestId?: string;
  raw?: unknown;
}

export interface ServerResponse {
  status(code: number): this;
  json(body: unknown): void | Promise<void>;
  send(body: unknown): void | Promise<void>;
  set(name: string, value: string): this;
  header(name: string, value: string): this;
  end(body?: unknown): void | Promise<void>;
}

export type ServerHandlerInput = ServerHandler | ServerHandler[] | ServerRouter;

export interface ServerRouter {
  use(
    pathOrHandler: string | ServerHandlerInput,
    ...handlers: ServerHandlerInput[]
  ): void;
  get(path: string, ...handlers: ServerHandler[]): void;
  post(path: string, ...handlers: ServerHandler[]): void;
  put(path: string, ...handlers: ServerHandler[]): void;
  delete(path: string, ...handlers: ServerHandler[]): void;
  patch(path: string, ...handlers: ServerHandler[]): void;
}

export interface ServerApp extends ServerRouter {
  set?(key: string, value: unknown): void;
  listen?(port: number, callback?: () => void): unknown;
}

export type ServerInstance = {
  close(callback?: () => void): void;
};

export interface ServerAdapter {
  runtime: ServerRuntime;
  createApp(): ServerApp;
  createRouter(): ServerRouter;
  configure(app: ServerApp, port: number): void;
  listen(app: ServerApp, port: number, onListen: () => void): ServerInstance;
}

export interface ServerContext {
  runtime: ServerRuntime;
  adapter: ServerAdapter;
}
