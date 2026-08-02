import { accessSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve as resolvePath, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), "../apps/web");

const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"];

function resolveWebAlias(specifier) {
  const rel = specifier.slice(2);
  const base = resolvePath(webRoot, "src", rel);
  if (/\.[a-z0-9]+$/i.test(rel)) {
    return base;
  }
  for (const ext of EXTENSIONS) {
    const candidate = `${base}${ext}`;
    try {
      accessSync(candidate);
      return candidate;
    } catch {
      // try next extension
    }
  }
  return `${base}.ts`;
}

/** Resolve Next.js `@/*` imports when running web unit tests outside the bundler. */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const file = resolveWebAlias(specifier);
    return nextResolve(pathToFileURL(file).href, context);
  }
  return nextResolve(specifier, context);
}
