import { BootstrapStandardServer } from "../src/BootstrapStandardServer";
import { RoutesModule, ControllersModule } from "../src/modules";
import { BaseServerService } from "../src/abstract";
import { Controller, Get } from "../src/decorators";
import { Router } from "express";
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
      controllersModule,
    );
    await server.initialize();
    const app = server.getApp();

    const resLegacy = await request(app).get("/legacy");
    expect(resLegacy.body).toEqual({ message: "legacy working" });

    const resController = await request(app).get("/test");
    expect(resController.body).toEqual({ message: "controller working" });
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
      [service],
    );

    expect(server).toBeDefined();
  });
});
