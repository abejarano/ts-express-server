import express, { Router } from "express";
import type { Express } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import {
  ServerAdapter,
  ServerApp,
  ServerInstance,
  ServerRouter,
  ServerRuntime,
} from "../abstract/ServerTypes";

export class ExpressAdapter implements ServerAdapter {
  runtime = ServerRuntime.Express;

  createApp(): ServerApp {
    return express() as unknown as ServerApp;
  }

  createRouter(): ServerRouter {
    return Router() as unknown as ServerRouter;
  }

  configure(app: ServerApp, port: number): void {
    const expressApp = app as unknown as Express;
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
