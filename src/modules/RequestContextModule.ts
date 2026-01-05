import { v4 } from "uuid";
import { BaseServerModule } from "../abstract";
import { NextFunction, ServerApp, ServerContext, ServerRequest } from "../abstract";
import { AsyncLocalStorage } from "async_hooks";

export class RequestContextModule extends BaseServerModule {
  name = "RequestContext";
  priority = -50;

  init(app: ServerApp, _context?: ServerContext): void {
    const requestContextMiddleware = (
      req: ServerRequest,
      _res: unknown,
      next: NextFunction,
    ) => {
      const incomingRequestId = req.headers["x-request-id"];
      const requestId =
        (Array.isArray(incomingRequestId)
          ? incomingRequestId[0]
          : incomingRequestId) || v4();

      req.requestId = requestId;
      RequestContext.run({ requestId }, () => {
        next();
      });
    };

    app.use(requestContextMiddleware);
  }

  getModuleName(): string {
    return this.name;
  }
}

interface Context {
  requestId: string;
}

class RequestContext {
  private static storage = new AsyncLocalStorage<Context>();

  // Obtiene el contexto actual
  static get currentContext(): Context | undefined {
    return this.storage.getStore();
  }

  // Obtiene el requestId actual del contexto
  static get requestId(): string | undefined {
    return this.currentContext?.requestId;
  }

  // Inicializa el contexto
  static run(context: Context, callback: () => void) {
    this.storage.run(context, callback);
  }
}

export { RequestContext };
