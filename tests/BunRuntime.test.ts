import { BootstrapServer } from "../src/BootstrapServer";
import { ControllersModule } from "../src/modules";
import { Controller, Get, Post, Body, Res } from "../src/decorators";
import { ServerResponse, ServerRuntime } from "../src/abstract";

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
  it("handles decorated routes without Express", async () => {
    const server = new BootstrapServer(0, { runtime: ServerRuntime.Bun });
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
    const server = new BootstrapServer(0, { runtime: ServerRuntime.Bun });
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
});
