import { Express } from "express";

export interface ServerModule {
  name: string;
  priority?: number;
  init(app: Express): Promise<void> | void;
  shutdown?(): Promise<void> | void;
}

export abstract class BaseServerModule implements ServerModule {
  abstract name: string;
  priority: number = 0;

  abstract init(app: Express): Promise<void> | void;

  async shutdown(): Promise<void> {
    // Default empty shutdown
  }
}
