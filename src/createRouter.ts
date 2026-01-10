import { ServerRuntime, ServerRouter } from "./abstract";
import { BunAdapter, ExpressAdapter } from "./adapters";

export const createRouter = (
  runtime: ServerRuntime = ServerRuntime.Express
): ServerRouter => {
  if (runtime === ServerRuntime.Bun) {
    return new BunAdapter().createRouter();
  }

  return new ExpressAdapter().createRouter();
};
