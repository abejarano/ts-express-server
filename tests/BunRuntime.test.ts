import { describe, it, expect } from "bun:test";
import { BunKitServer } from "../src/BunKitServer";
import { ControllersModule } from "../src/modules";
import { Controller, Get, Post, Body, Res } from "../src/decorators";
import type { ServerResponse } from "../src/abstract";
import { createDecoratedTestApp } from "../src/testing";

@Controller("/bun")
class BunController {
  @Get("/health")
  health(_req: any, res: ServerResponse) {
    res.json({ ok: true });
  }

  @Post("/echo")
  echo(@Body() body: any, @Res() res: ServerResponse) {
    res.json({ body });
  }
}

describe("Bun runtime", () => {
  it("handles decorated routes", async () => {
    const server = new BunKitServer(0);
    server.addModule(new ControllersModule([BunController]));
    await server.initialize();

    const app = server.getApp() as any;
    const handler = app.createFetchHandler();

    const response = await handler(
      new Request("http://localhost/bun/health", { method: "GET" })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("parses JSON bodies in Bun runtime", async () => {
    const server = new BunKitServer(0);
    server.addModule(new ControllersModule([BunController]));
    await server.initialize();

    const app = server.getApp() as any;
    const handler = app.createFetchHandler();

    const response = await handler(
      new Request("http://localhost/bun/echo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      body: { message: "hello" },
    });
  });

  it("creates a controller with Bun runtime using the test helper", async () => {
    const { app, stop } = await createDecoratedTestApp({
      controllers: [BunController],
    });

    const handler = (app as any).createFetchHandler();
    const response = await handler(
      new Request("http://localhost/bun/health", { method: "GET" })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });

    await stop();
  });
});
