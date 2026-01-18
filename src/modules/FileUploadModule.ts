import { BaseServerModule } from "../abstract";
import { BunMultipartFile, ServerApp, ServerContext } from "../abstract";

export type FileUploadOptions = {
  maxBodyBytes?: number;
  maxFileBytes?: number;
  maxFiles?: number;
  maxFields?: number;
  maxFieldBytes?: number;
  maxFieldsBytes?: number;
  allowedMimeTypes?: string[];
  allowedFileSignatures?: Array<"png" | "jpg" | "jpeg" | "pdf" | "csv">;
  validateFile?: (file: BunMultipartFile) => boolean | Promise<boolean>;
};

export class FileUploadModule extends BaseServerModule {
  name = "FileUpload";
  priority = -60;

  private fileUploadOptions: FileUploadOptions;

  constructor(fileUploadOptions?: FileUploadOptions) {
    super();
    this.fileUploadOptions = fileUploadOptions ?? {};
  }

  getModuleName(): string {
    return this.name;
  }

  init(app: ServerApp, context?: ServerContext): void {
    app.set?.("fileUploadEnabled", true);
    app.set?.("multipart", this.fileUploadOptions);
  }
}
