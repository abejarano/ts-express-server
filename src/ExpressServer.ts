import express, { Express } from "express";
import { Server as HttpServer } from "http";
import { ServerModule } from "./abstract/ServerModule";
import { ServiceModule } from "./abstract/ServiceModule";

export class ExpressServer {
  private readonly app: Express;
  private readonly port: number;
  private httpServer?: HttpServer;
  private modules: ServerModule[] = [];
  private services: ServiceModule[] = [];

  constructor(port: number) {
    this.port = port;
    this.app = express();
    this.app.set("port", port);
  }

  addModule(module: ServerModule): ExpressServer {
    this.modules.push(module);
    return this;
  }

  addModules(modules: ServerModule[]): ExpressServer {
    this.modules.push(...modules);
    return this;
  }

  addService(service: ServiceModule): ExpressServer {
    this.services.push(service);
    return this;
  }

  addServices(services: ServiceModule[]): ExpressServer {
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
    // Inicializar servicios primero
    await this.initializeServices();

    // Luego inicializar módulos del servidor
    await this.initializeServerModules();
  }

  async start(): Promise<void> {
    await this.initialize();

    return new Promise((resolve) => {
      this.httpServer = this.app.listen(this.port, () => {
        console.log(`Server running on port ${this.port}`);

        this.setupGracefulShutdown();
        resolve();
      });
    });
  }

  async gracefulShutdown(): Promise<void> {
    try {
      console.log("Starting graceful shutdown...");

      // Ejecutar shutdown de módulos en orden inverso
      const reversedModules = [...this.modules].reverse();

      for (const module of reversedModules) {
        if (module.shutdown) {
          try {
            console.log(`Shutting down module: ${module.name}`);
            await module.shutdown();
            console.log(`Module shutdown completed: ${module.name}`);
          } catch (error) {
            console.error(`Error shutting down module ${module.name}:`, error);
          }
        }
      }

      // Detener servicios en orden inverso
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

      // Cerrar servidor HTTP
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

  // Métodos de conveniencia para acceder a módulos específicos
  getModule<T extends ServerModule>(
    moduleClass: new (...args: any[]) => T,
  ): T | undefined {
    return this.modules.find((m) => m instanceof moduleClass) as T | undefined;
  }

  hasModule(moduleClass: new (...args: any[]) => any): boolean {
    return this.modules.some((m) => m instanceof moduleClass);
  }

  private async initializeServices(): Promise<void> {
    console.log("Starting services...");

    for (const service of this.services) {
      try {
        console.log(`Starting service: ${service.name}`);
        await service.start();
        console.log(`Service started: ${service.name}`);
      } catch (error) {
        console.error(`Failed to start service ${service.name}:`, error);
        throw error;
      }
    }

    console.log("All services started successfully");
  }

  private async initializeServerModules(): Promise<void> {
    // Ordenar módulos por prioridad (menor número = mayor prioridad)
    this.modules.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    console.log("Initializing server modules...");

    for (const module of this.modules) {
      try {
        console.log(`Initializing module: ${module.name}`);
        await module.init(this.app);
        console.log(`Module initialized: ${module.name}`);
      } catch (error) {
        console.error(`Failed to initialize module ${module.name}:`, error);
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
