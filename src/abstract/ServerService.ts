import { ServerInstance } from "./ServerTypes";

export abstract class BaseServerService {
  abstract name: string;

  abstract start(server: ServerInstance): Promise<void> | void;

  async stop(): Promise<void> {
    // Default empty stop
  }
}
