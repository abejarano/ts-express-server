import { Server as HttpServer } from "http";

export abstract class BaseServerService {
  abstract name: string;

  abstract start(http: HttpServer): Promise<void> | void;

  async stop(): Promise<void> {
    // Default empty stop
  }
}
