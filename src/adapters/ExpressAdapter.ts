import type { Express } from "express";
import {
  ServerAdapter,
  ServerApp,
  ServerInstance,
  ServerRouter,
  ServerRuntime,
} from "../abstract/ServerTypes";

type ExpressModule = typeof import("express");

let expressModule: ExpressModule | null = null;

const getExpressModule = (): ExpressModule => {
  if (!expressModule) {
    expressModule = require("express") as ExpressModule;
  }
  return expressModule;
};

export class ExpressAdapter implements ServerAdapter {
  runtime = ServerRuntime.Express;

  createApp(): ServerApp {
    const express = getExpressModule();
    return express() as unknown as ServerApp;
  }

  createRouter(): ServerRouter {
    const express = getExpressModule();
    return express.Router() as unknown as ServerRouter;
  }

  configure(app: ServerApp, port: number): void {
    const expressApp = app as unknown as Express;
    const express = getExpressModule();
    const bodyParser = require("body-parser") as typeof import("body-parser");
    const cookieParser =
      require("cookie-parser") as typeof import("cookie-parser");
    expressApp.use(express.json());
    expressApp.use(bodyParser.urlencoded({ extended: true }));
    expressApp.use(cookieParser());
    expressApp.set("port", port);
    expressApp.set("trust proxy", 1);
  }

  listen(app: ServerApp, port: number, onListen: () => void): ServerInstance {
    const expressApp = app as unknown as Express;
    return expressApp.listen(port, onListen);
  }
}
