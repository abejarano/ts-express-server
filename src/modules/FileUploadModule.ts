import fileUpload from "express-fileupload";
import { BaseServerModule } from "../abstract";
import {
  ServerApp,
  ServerContext,
  ServerHandler,
  ServerRequest,
  ServerRuntime,
} from "../abstract";

export class FileUploadModule extends BaseServerModule {
  name = "FileUpload";
  priority = -60;

  private fileUploadOptions: fileUpload.Options;

  constructor(fileUploadOptions?: fileUpload.Options) {
    super();
    this.fileUploadOptions = fileUploadOptions || {
      limits: { fileSize: 50 * 1024 * 1024 },
      useTempFiles: true,
      tempFileDir: "/tmp/",
    };
  }

  getModuleName(): string {
    return this.name;
  }

  init(app: ServerApp, context?: ServerContext): void {
    const runtime = context?.runtime ?? ServerRuntime.Express;
    if (runtime === ServerRuntime.Express) {
      app.use(fileUpload(this.fileUploadOptions) as ServerHandler);
      return;
    }

    app.use(createBunFileUploadMiddleware());
  }
}

const createBunFileUploadMiddleware = (): ServerHandler => {
  return async (req: ServerRequest, _res, next) => {
    if (!req.raw || req.files) {
      return next();
    }

    const contentType = String(req.headers?.["content-type"] || "");
    if (!contentType.includes("multipart/form-data")) {
      return next();
    }

    try {
      const formData = await (req.raw as Request).formData();
      const files: Record<string, unknown> = {};
      const body: Record<string, unknown> = {};

      formData.forEach((value, key) => {
        if (value instanceof File) {
          files[key] = value;
        } else {
          body[key] = value;
        }
      });

      if (Object.keys(files).length) {
        req.files = files;
      }

      if (Object.keys(body).length && req.body === undefined) {
        req.body = body;
      }
    } catch {
      // Ignore malformed multipart payloads.
    }

    next();
  };
};
