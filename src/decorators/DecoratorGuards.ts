export function assertLegacyDecorator(
  args: any[],
  decoratorName: string
): void {
  const context = args[1];
  if (
    args.length === 2 &&
    context &&
    typeof context === "object" &&
    "kind" in context
  ) {
    throw new Error(
      `[bun-platform-kit] ${decoratorName} is not compatible with ` +
        `standard TypeScript decorators. Enable "experimentalDecorators": true ` +
        `in your tsconfig and ensure your files are included by that config.`
    );
  }
}
