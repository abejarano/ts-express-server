import { Express } from "express";

export abstract class BaseServerModule {
  abstract name: string;
  priority: number = 0;

  abstract init(app: Express): Promise<void> | void;

  async shutdown(): Promise<void> {
    // Default empty shutdown
  }
}
