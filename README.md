# TypeScript Express Server Framework

A modular and extensible TypeScript framework for building Express.js servers with a clean architecture pattern that separates concerns between server modules and services.

## Features

- 🏗️ **Modular Architecture**: Build your server using reusable modules
- 🚀 **Service Management**: Integrate background services that start with your server
- 📦 **Built-in Modules**: Pre-configured modules for common functionality
- 🔄 **Graceful Shutdown**: Proper cleanup and shutdown handling
- ⚡ **Priority System**: Control module initialization order
- 🛡️ **Type Safety**: Full TypeScript support with strong typing
- 🔧 **Configurable**: Highly customizable modules and services

## Installation

```bash
npm install @abejarano/ts-express-server
# or
yarn add @abejarano/ts-express-server
```

## Core Concepts

### ServerModule

**ServerModules** are components that configure and enhance the Express.js application during startup. They handle middleware setup, route registration, and other Express-specific configurations.

Key characteristics:
- Extend `BaseServerModule`
- Initialize during server startup via the `init()` method
- Support priority-based initialization order
- Can implement graceful shutdown logic
- Examples: CORS setup, security headers, route registration, rate limiting

### ServerService

**ServerServices** are background services that start when the HTTP server is ready. They handle long-running tasks, external connections, and background processes.

Key characteristics:
- Extend `BaseServerService`
- Start after the HTTP server is listening via the `start()` method
- Receive the HTTP server instance for advanced integrations
- Support graceful shutdown via the `stop()` method
- Examples: Database connections, WebSocket servers, background job processors

## Quick Start

### Basic Server Setup

```typescript
import { BootstrapServer, RoutesModule } from '@abejarano/ts-express-server';
import { Router } from 'express';

// Create a simple route
const apiRouter = Router();
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Configure routes module
const routesModule = new RoutesModule([
  { path: '/api', router: apiRouter }
]);

// Create and start server
const server = new BootstrapServer(3000)
  .addModule(routesModule);

server.start().then(() => {
  console.log('Server is running on http://localhost:3000');
});
```

### Using the Standard Server (Recommended)

For most applications, use `BootstrapStandardServer` which includes common modules:

```typescript
import { BootstrapStandardServer, RoutesModule } from '@abejarano/ts-express-server';
import { Router } from 'express';

const apiRouter = Router();
apiRouter.get('/users', (req, res) => {
  res.json({ users: [] });
});

const routesModule = new RoutesModule([
  { path: '/api', router: apiRouter }
]);

const server = BootstrapStandardServer(3000, routesModule);

server.start();
```

The standard server includes:
- **CorsModule**: Cross-Origin Resource Sharing configuration
- **SecurityModule**: Security headers via Helmet
- **RateLimitModule**: Rate limiting protection
- **FileUploadModule**: File upload handling
- **RequestContextModule**: Request context and correlation IDs

## Creating Custom Modules

### Basic Module Example

```typescript
import { Express } from 'express';
import { BaseServerModule } from '@abejarano/ts-express-server';

export class LoggingModule extends BaseServerModule {
  name = 'Logging';
  priority = -100; // Higher priority (loads earlier)

  init(app: Express): void {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }
}
```

### Advanced Module with Configuration

```typescript
import { Express } from 'express';
import { BaseServerModule } from '@abejarano/ts-express-server';
import compression from 'compression';

export interface CompressionConfig {
  level: number;
  threshold: string;
}

export class CompressionModule extends BaseServerModule {
  name = 'Compression';
  priority = -50;

  constructor(private config: CompressionConfig = { level: 6, threshold: '1kb' }) {
    super();
  }

  init(app: Express): void {
    app.use(compression({
      level: this.config.level,
      threshold: this.config.threshold
    }));
  }

  async shutdown(): Promise<void> {
    console.log('Compression module shutdown');
  }
}
```

## Creating Custom Services

### Database Service Example

```typescript
import { Server as HttpServer } from 'http';
import { BaseServerService } from '@abejarano/ts-express-server';
import mongoose from 'mongoose';

export class MongoDBService extends BaseServerService {
  name = 'MongoDB';
  
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
      
      console.log('Connected to MongoDB successfully');
      
      // Set up connection event listeners
      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });
      
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }
}
```

### WebSocket Service Example

```typescript
import { Server as HttpServer } from 'http';
import { BaseServerService } from '@abejarano/ts-express-server';
import { Server as SocketIOServer } from 'socket.io';

export class WebSocketService extends BaseServerService {
  name = 'WebSocket';
  private io?: SocketIOServer;

  async start(http: HttpServer): Promise<void> {
    this.io = new SocketIOServer(http, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    console.log('WebSocket service started');
  }

  async stop(): Promise<void> {
    if (this.io) {
      this.io.close();
      console.log('WebSocket service stopped');
    }
  }
}
```

## Complete Example with Services

```typescript
import { BootstrapStandardServer, RoutesModule } from '@abejarano/ts-express-server';
import { Router } from 'express';

// Custom services
class MongoDBService extends BaseServerService {
  name = 'MongoDB';
  
  constructor(private connectionString: string) {
    super();
  }

  async start(): Promise<void> {
    // MongoDB connection logic
    console.log('MongoDB service started');
  }

  async stop(): Promise<void> {
    console.log('MongoDB service stopped');
  }
}

class RedisService extends BaseServerService {
  name = 'Redis';

  async start(): Promise<void> {
    // Redis connection logic
    console.log('Redis service started');
  }

  async stop(): Promise<void> {
    console.log('Redis service stopped');
  }
}

// Routes
const apiRouter = Router();
apiRouter.get('/users', (req, res) => {
  res.json({ message: 'Users endpoint' });
});

const routesModule = new RoutesModule([
  { path: '/api/v1', router: apiRouter }
]);

// Services
const services = [
  new MongoDBService('mongodb://localhost:27017/myapp'),
  new RedisService()
];

// Create server
const server = BootstrapStandardServer(3000, routesModule, services);

// Start server
server.start().then(() => {
  console.log('🚀 Server running on http://localhost:3000');
});
```

## Module Priority System

Modules are initialized in priority order (lower numbers = higher priority):

```typescript
// System modules (negative priorities)
CorsModule: -90
SecurityModule: -80
RateLimitModule: -70
// ... other system modules

// Application modules (positive priorities)
RoutesModule: 10
// ... your custom modules
```

## Environment Configuration

```typescript
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';

const services = [
  new MongoDBService(mongoUri)
];

const server = BootstrapStandardServer(port, routesModule, services);
```

## API Reference

### BootstrapServer Methods

- `addModule(module: BaseServerModule)`: Add a single module
- `addModules(modules: BaseServerModule[])`: Add multiple modules
- `addService(service: BaseServerService)`: Add a single service
- `addServices(services: BaseServerService[])`: Add multiple services
- `getApp()`: Get the Express application instance
- `getModule<T>(moduleClass)`: Get a specific module instance
- `hasModule(moduleClass)`: Check if a module is registered
- `start()`: Start the server
- `gracefulShutdown()`: Perform graceful shutdown

### BaseServerModule Properties

- `name: string`: Module identifier
- `priority: number`: Initialization priority (default: 0)
- `init(app: Express)`: Module initialization method
- `shutdown()`: Optional cleanup method

### BaseServerService Properties

- `name: string`: Service identifier
- `start(http: HttpServer)`: Service startup method
- `stop()`: Optional cleanup method

## Built-in Modules

- **CorsModule**: Configures Cross-Origin Resource Sharing
- **SecurityModule**: Adds security headers using Helmet
- **RateLimitModule**: Implements rate limiting
- **FileUploadModule**: Handles file uploads
- **RequestContextModule**: Adds request correlation IDs
- **RoutesModule**: Manages application routes

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Conventional Commits

We use Conventional Commits to automatically generate releases:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Format, spaces, etc.
- `refactor:` - Code refactoring
- `test:` - Add tests
- `chore:` - Maintenance tasks

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Angel Bejarano - angel.bejarano@jaspesoft.com