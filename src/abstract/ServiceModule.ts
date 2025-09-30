export interface ServiceModule {
  name: string;
  start(): Promise<void> | void;
  stop?(): Promise<void> | void;
}

export abstract class BaseServiceModule implements ServiceModule {
  abstract name: string;

  abstract start(): Promise<void> | void;

  async stop(): Promise<void> {
    // Default empty stop
  }
}
