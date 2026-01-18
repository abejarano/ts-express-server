# Bun Platform Kit

Un framework TypeScript para Bun, dev-friendly y enterprise-ready. Organiza APIs con modulos, servicios y controladores decorados, incluye middlewares esenciales listos para usar y mantiene tipado end-to-end sin friccion.

## Features

- 🧩 **Arquitectura modular**: reemplaza o combina modulos sin acoplarte al core
- 🚀 **Servicios de fondo**: inicia procesos y workers junto al servidor
- 🧰 **Preset listo**: CORS, seguridad, rate limit, uploads y contexto de request
- 🧭 **Prioridades claras**: control total del orden de inicializacion
- 🔒 **Defaults seguros**: headers, limites y validaciones razonables
- 🧪 **Testing simple**: helper para apps decoradas sin repetir bootstrap
- 🛡️ **Type safety real**: tipado fuerte en request, response y decoradores
- 🎯 **Decoradores claros**: rutas declarativas y faciles de mantener

## Beneficios

- ⚡ **Time-to-first-endpoint** rapido con el preset estandar
- 🤝 **Consistencia de equipo** con patrones claros de modulos/servicios
- 🧱 **Escalable**: agrega piezas sin reescribir el servidor
- 🔍 **Observabilidad** basica con requestId y contexto por request
- ✅ **Testing confiable** con helpers de bootstrap para pruebas

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

Uploads are disabled unless `FileUploadModule` is registered. Configure limits and MIME allowlists through the module:

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
