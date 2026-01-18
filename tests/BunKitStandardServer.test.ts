// @ts-nocheck
import { describe, it, expect } from "bun:test";
import { BunKitStandardServer } from "../src/BunKitStandardServer";
import { ControllersModule, FileUploadModule } from "../src/modules";
import {
  BaseServerModule,
  BaseServerService,
  ServerApp,
} from "../src/abstract";
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

  init(app: ServerApp): void {
    this.initialized = true;
    app.set("tracking", true);
  }
}

const buildHandler = (
  server: import("../src/BunKitServer").BunKitServer,
): ((request: Request) => Promise<Response>) => {
  const app = server.getApp() as any;
  return app.createFetchHandler();
};

const requestJson = async (
  handler: (request: Request) => Promise<Response>,
  path: string,
  init?: RequestInit,
) => {
  const response = await handler(
    new Request(`http://localhost${path}`, init),
  );
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  return { status: response.status, body };
};

describe("BunKitStandardServer", () => {
  const port = 3000;

  it("should work with controllers", async () => {
    const controllersModule = new ControllersModule([TestController]);

    const server = BunKitStandardServer(port, controllersModule);
    await server.initialize();
    const handler = buildHandler(server);

    const response = await requestJson(handler, "/test", { method: "GET" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "controller working" });
  });

  it("should inject parameters using decorators", async () => {
    const controllersModule = new ControllersModule([UsersController]);

    const server = BunKitStandardServer(port, controllersModule);
    await server.initialize();
    const handler = buildHandler(server);

    const response = await requestJson(handler, "/users/123", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alice" }),
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: "123", name: "Alice" });
  });

  it("should reject file uploads when FileUploadModule is disabled", async () => {
    const controllersModule = new ControllersModule([UploadController]);

    const server = BunKitStandardServer(port, controllersModule, {
      modules: { fileUpload: false },
    });
    await server.initialize();
    const handler = buildHandler(server);

    const form = new FormData();
    const file = new File(["test"], "test.txt", {
      type: "text/plain",
    });
    form.set("file", file);
    const response = await requestJson(handler, "/upload", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(415);
    expect(response.body).toEqual({
      message: "File uploads are disabled. Enable FileUploadModule.",
    });
  });

  it("should accept services with controllers", () => {
    const controllersModule = new ControllersModule([]);
    const service = new MockService();

    const server = BunKitStandardServer(port, controllersModule, [service]);

    expect(server).toBeDefined();
  });

  it("should allow customizing preset modules", async () => {
    const controllersModule = new ControllersModule([]);
    const trackingModule = new TrackingModule();

    const server = BunKitStandardServer(port, controllersModule, {
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

    const handler = (app as any).createFetchHandler();
    const response = await requestJson(handler, "/users/42", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Eve" }),
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: "42", name: "Eve" });

    await stop();
  });
});
