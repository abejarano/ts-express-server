import { ServerRuntime, ServerRuntimeInput, ServerRouter } from "./abstract";
import { BunAdapter, ExpressAdapter } from "./adapters";

export const createRouter = (
  runtime: ServerRuntimeInput = ServerRuntime.Express,
): ServerRouter => {
  if (runtime === ServerRuntime.Bun || runtime === "bun") {
    return new BunAdapter().createRouter();
  }
  return new ExpressAdapter().createRouter();
};
