import {
  normalizeRuntime,
  ServerRuntime,
  ServerRuntimeInput,
  ServerRouter,
} from "./abstract";
import { BunAdapter, ExpressAdapter } from "./adapters";

export const createRouter = (
  runtime: ServerRuntimeInput = ServerRuntime.Express,
): ServerRouter => {
  if (normalizeRuntime(runtime) === ServerRuntime.Bun) {
    return new BunAdapter().createRouter();
  }
  return new ExpressAdapter().createRouter();
};
