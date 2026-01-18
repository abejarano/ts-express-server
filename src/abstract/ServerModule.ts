import { ServerApp, ServerContext } from "./ServerTypes";

export abstract class BaseServerModule {
  priority: number = 0;

  /*
   * Returns the name of the module.
   */
  abstract getModuleName(): string;

  abstract init(
    app: ServerApp,
    context?: ServerContext,
  ): Promise<void> | void;

  async shutdown(): Promise<void> {
    // Default empty shutdown
  }
}
