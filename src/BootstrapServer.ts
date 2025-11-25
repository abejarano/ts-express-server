import express, { Express } from "express";
import { Server as HttpServer } from "http";
import { BaseServerModule, BaseServerService } from "./abstract";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";

export class BootstrapServer {
  private readonly app: Express;
  private readonly port: number;
  private httpServer?: HttpServer;
  private modules: BaseServerModule[] = [];
  private services: BaseServerService[] = [];

  constructor(port: number) {
    this.port = port;
    this.app = express();
    this.app.use(express.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(cookieParser());
    this.app.set("port", port);
  }

  removeModule(moduleName: string): BootstrapServer {
    this.modules = this.modules.filter((m) => m.getModuleName() !== moduleName);
    return this;
  }

  addModule(module: BaseServerModule): BootstrapServer {
    const existingModuleIndex = this.modules.findIndex(
      (m) => m.getModuleName() === module.getModuleName()
    );

    if (existingModuleIndex !== -1) {
      // Replace existing module
      this.modules[existingModuleIndex] = module;
    } else {
      // Add new module
      this.modules.push(module);
    }
    return this;
  }

  addModules(modules: BaseServerModule[]): BootstrapServer {
    for (const module of modules) {
      const existingModuleIndex = this.modules.findIndex(
        (m) => m.getModuleName() === module.getModuleName()
      );
      if (existingModuleIndex !== -1) {
        // Replace existing module
        this.modules[existingModuleIndex] = module;
      } else {
        // Add new module
        this.modules.push(module);
      }
    }
    return this;
  }

  addService(service: BaseServerService): BootstrapServer {
    this.services.push(service);
    return this;
  }

  addServices(services: BaseServerService[]): BootstrapServer {
    this.services.push(...services);
    return this;
  }

  getApp(): Express {
    return this.app;
  }

  getHttpServer(): HttpServer | undefined {
    return this.httpServer;
  }

  async initialize(): Promise<void> {
    await this.initializeServerModules();
  }

  async start(): Promise<void> {
    await this.initializeServerModules();

    return new Promise((resolve) => {
      this.httpServer = this.app.listen(this.port, () => {
        console.log(`Server running on port ${this.port}`);

        this.setupGracefulShutdown();
        resolve();
      });

      this.initializeServices(this.httpServer);
    });
  }

  async gracefulShutdown(): Promise<void> {
    try {
      console.log("Starting graceful shutdown...");

      // Execute module shutdown in reverse order
      const reversedModules = [...this.modules].reverse();

      for (const module of reversedModules) {
        if (module.shutdown) {
          try {
            console.log(`Shutting down module: ${module.getModuleName()}`);
            await module.shutdown();
            console.log(`Module shutdown completed: ${module.getModuleName()}`);
          } catch (error) {
            console.error(
              `Error shutting down module ${module.getModuleName()}:`,
              error
            );
          }
        }
      }

      // Stop services in reverse order
      const reversedServices = [...this.services].reverse();

      for (const service of reversedServices) {
        if (service.stop) {
          try {
            console.log(`Stopping service: ${service.name}`);
            await service.stop();
            console.log(`Service stopped: ${service.name}`);
          } catch (error) {
            console.error(`Error stopping service ${service.name}:`, error);
          }
        }
      }

      // Close HTTP server
      if (this.httpServer) {
        console.log("Closing HTTP server...");
        await new Promise<void>((resolve) => {
          this.httpServer!.close(() => resolve());
        });
        console.log("HTTP server closed");
      }

      console.log("Graceful shutdown completed. Exiting...");
      process.exit(0);
    } catch (error) {
      console.error("Error during graceful shutdown:", error);
      process.exit(1);
    }
  }

  // Convenience methods to access specific modules
  getModule<T extends BaseServerModule>(
    moduleClass: new (...args: any[]) => T
  ): T | undefined {
    return this.modules.find((m) => m instanceof moduleClass) as T | undefined;
  }

  hasModule(moduleClass: new (...args: any[]) => any): boolean {
    return this.modules.some((m) => m instanceof moduleClass);
  }

  private async initializeServices(http: HttpServer): Promise<void> {
    console.log("Starting services...");

    for (const service of this.services) {
      try {
        await service.start(http);
        console.log(`Service started: ${service.name}`);
      } catch (error) {
        console.error(`Failed to start service ${service.name}:`, error);
        throw error;
      }
    }

    console.log("All services started successfully");
  }

  private async initializeServerModules(): Promise<void> {
    // Sort modules by priority (lower number = higher priority)
    this.modules.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    console.log("Initializing server modules in priority order:");

    for (const module of this.modules) {
      try {
        await module.init(this.app);
        console.log(`Module initialized: ${module.getModuleName()}`);
      } catch (error) {
        console.error(
          `Failed to initialize module ${module.getModuleName()}:`,
          error
        );
        throw error;
      }
    }

    console.log("All modules initialized successfully");
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`${signal} signal received. Shutting down application...`);
      await this.gracefulShutdown();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  }
}
