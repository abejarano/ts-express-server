# Bun Platform Kit

A TypeScript framework for Bun, dev-friendly and enterprise-ready. Organize APIs with modules, services, and decorated controllers, ship essential middleware out of the box, and keep end-to-end typing without friction.

## Features

- 🧩 **Modular architecture**: add, replace, or disable modules without coupling to the core
- 🚀 **Background services**: start processes and workers with `BaseServerService`
- 🧰 **Standard preset**: CORS, security headers, in-memory rate limit, uploads, and request context
- 🧭 **Clear priorities**: deterministic module initialization order
- 🔒 **Safe defaults**: reasonable headers and limits out of the box
- 🧪 **Simple testing**: helper for decorated apps without repeated bootstrap
- 🛡️ **Real type safety**: strong typing on request, response, and decorators
- 🎯 **Clean decorators**: declarative, easy-to-maintain routes

## Benefits

- ⚡ **Fast time-to-first-endpoint** with the standard preset
- 🤝 **Team consistency** with clear module/service patterns
- 🧱 **Scalable**: add pieces without rewriting the server
- 🔍 **Basic observability** with requestId and per-request context
- ✅ **Reliable testing** with bootstrap helpers for tests

## Installation

```bash
bun add bun-platform-kit
```

## Documentation

- [Getting Started](docs/getting-started.md)
- [Core Concepts](docs/core-concepts.md)
- [Modules](docs/modules.md)
- [Using Decorators](docs/decorators.md)
- [Services](docs/services.md)
- [Testing Helpers](docs/testing.md)
- [API Reference](docs/api-reference.md)
- [Examples](docs/examples.md)

## File uploads

With `BunKitStandardServer`, uploads are enabled by default. If you use `BunKitServer` directly or disable the module, you need to register `FileUploadModule`. Configure limits and allowlists through the module:

```typescript
import { FileUploadModule } from "bun-platform-kit";

const fileUpload = new FileUploadModule({
  maxBodyBytes: 10 * 1024 * 1024,
  maxFileBytes: 10 * 1024 * 1024,
  maxFiles: 10,
  allowedMimeTypes: ["image/*", "application/pdf"],
});
```

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
