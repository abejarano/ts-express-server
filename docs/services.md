# Services

## Creating Custom Services

### Database Service Example

```typescript
import { Server as HttpServer } from "http";
import { BaseServerService } from "@abejarano/ts-express-server";
import mongoose from "mongoose";

export class MongoDBService extends BaseServerService {
  name = "MongoDB";

  constructor(private connectionString: string) {
    super();
  }

  async start(http: HttpServer): Promise<void> {
    try {
      await mongoose.connect(this.connectionString, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log("Connected to MongoDB successfully");

      // Set up connection event listeners
      mongoose.connection.on("error", (error) => {
        console.error("MongoDB connection error:", error);
      });

      mongoose.connection.on("disconnected", () => {
        console.log("MongoDB disconnected");
      });
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    } catch (error) {
      console.error("Error closing MongoDB connection:", error);
      throw error;
    }
  }
}
```

### WebSocket Service Example

```typescript
import { Server as HttpServer } from "http";
import { BaseServerService } from "@abejarano/ts-express-server";
import { Server as SocketIOServer } from "socket.io";

export class WebSocketService extends BaseServerService {
  name = "WebSocket";
  private io?: SocketIOServer;

  async start(http: HttpServer): Promise<void> {
    this.io = new SocketIOServer(http, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    console.log("WebSocket service started");
  }

  async stop(): Promise<void> {
    if (this.io) {
      this.io.close();
      console.log("WebSocket service stopped");
    }
  }
}
```
