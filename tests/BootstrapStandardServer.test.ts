// @ts-nocheck
import { BootstrapStandardServer } from "../src/BootstrapStandardServer";
import {
  RoutesModule,
  ControllersModule,
  FileUploadModule,
} from "../src/modules";
import { BaseServerModule, BaseServerService } from "../src/abstract";
import { createDecoratedTestApp } from "../src/testing";
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UploadedFile,
} from "../src/decorators";
import { Router } from "express";
import type { Express } from "express";
import request from "supertest";

jest.mock("uuid", () => ({
  v4: () => "test-uuid",
}));

// Mock Service
class MockService extends BaseServerService {
  name = "MockService";
  async start() {}
  async stop() {}
}

// Mock Controller
@Controller("/test")
class TestController {
  @Get("/")
  index(req: any, res: any) {
    res.json({ message: "controller working" });
  }
}

@Controller("/users")
class UsersController {
  @Post("/:userId")
  async updateUser(
    @Param("userId") userId: string,
    @Body() body: any,
    @Res() res: any
  ) {
    res.json({ userId, ...body });
  }
}

@Controller("/upload")
class UploadController {
  @Post("/")
  async upload(@UploadedFile("file") file: any, @Res() res: any) {
    res.json({ fileName: file?.name ?? null });
  }
}

class TrackingModule extends BaseServerModule {
  name = "Tracking";
  initialized = false;

  getModuleName(): string {
    return this.name;
  }

  init(app: Express): void {
    this.initialized = true;
    app.set("tracking", true);
  }
}

describe("BootstrapStandardServer", () => {
  const port = 3000;

  it("should work with legacy routes only", async () => {
    const router = Router();
    router.get("/", (req, res) => res.json({ message: "legacy working" }));
    const routesModule = new RoutesModule([{ path: "/legacy", router }]);

    const server = BootstrapStandardServer(port, routesModule);
    await server.initialize();
    const app = server.getApp();

    const response = await request(app).get("/legacy");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "legacy working" });
  });

  it("should work with controllers only", async () => {
    const controllersModule = new ControllersModule([TestController]);

    const server = BootstrapStandardServer(port, controllersModule);
    await server.initialize();
    const app = server.getApp();

    const response = await request(app).get("/test");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "controller working" });
  });

  it("should work with both routes and controllers", async () => {
    const router = Router();
    router.get("/", (req, res) => res.json({ message: "legacy working" }));
    const routesModule = new RoutesModule([{ path: "/legacy", router }]);
    const controllersModule = new ControllersModule([TestController]);

    const server = BootstrapStandardServer(
      port,
      routesModule,
      controllersModule
    );
    await server.initialize();
    const app = server.getApp();

    const resLegacy = await request(app).get("/legacy");
    expect(resLegacy.body).toEqual({ message: "legacy working" });

    const resController = await request(app).get("/test");
    expect(resController.body).toEqual({ message: "controller working" });
  });

  it("should inject parameters using decorators", async () => {
    const controllersModule = new ControllersModule([UsersController]);

    const server = BootstrapStandardServer(port, controllersModule);
    await server.initialize();
    const app = server.getApp();

    const response = await request(app)
      .post("/users/123")
      .send({ name: "Alice" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: "123", name: "Alice" });
  });

  it("should inject uploaded files", async () => {
    const controllersModule = new ControllersModule([UploadController]);

    const server = BootstrapStandardServer(port, controllersModule);
    await server.initialize();
    const app = server.getApp();

    const response = await request(app)
      .post("/upload")
      .attach("file", Buffer.from("test"), "test.txt");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ fileName: "test.txt" });
  });

  it("should accept services with legacy routes", () => {
    const routesModule = new RoutesModule([]);
    const service = new MockService();

    const server = BootstrapStandardServer(port, routesModule, [service]);

    // We can't easily check if service is added without exposing it,
    // but we can check if it didn't crash
    expect(server).toBeDefined();
  });

  it("should accept services with controllers", () => {
    const controllersModule = new ControllersModule([]);
    const service = new MockService();

    const server = BootstrapStandardServer(port, controllersModule, [service]);

    expect(server).toBeDefined();
  });

  it("should accept services with both", () => {
    const routesModule = new RoutesModule([]);
    const controllersModule = new ControllersModule([]);
    const service = new MockService();

    const server = BootstrapStandardServer(
      port,
      routesModule,
      controllersModule,
      [service]
    );

    expect(server).toBeDefined();
  });

  it("should allow customizing preset modules", async () => {
    const controllersModule = new ControllersModule([]);
    const trackingModule = new TrackingModule();

    const server = BootstrapStandardServer(port, controllersModule, {
      modules: {
        fileUpload: false,
        extra: [trackingModule],
      },
    });

    expect(server.getModule(FileUploadModule)).toBeUndefined();
    expect(server.getModule(TrackingModule)).toBe(trackingModule);

    await server.initialize();

    expect(trackingModule.initialized).toBe(true);
  });

  it("should create an app for decorated controllers using the test helper", async () => {
    const { app, stop } = await createDecoratedTestApp({
      controllers: [UsersController],
    });

    const response = await request(app)
      .post("/users/42")
      .send({ name: "Eve" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: "42", name: "Eve" });

    await stop();
  });

  it("should throw when multiple controller modules are provided", () => {
    const firstControllers = new ControllersModule([]);
    const secondControllers = new ControllersModule([]);

    expect(() =>
      BootstrapStandardServer(port, firstControllers, secondControllers)
    ).toThrow(
      "ControllersModule provided multiple times. Pass a single instance only."
    );
  });
});
