import { Express } from "express";
import fileUpload from "express-fileupload";
import { BaseServerModule } from "../abstract/ServerModule";

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

  init(app: Express): void {
    app.use(fileUpload(this.fileUploadOptions));
  }
}
